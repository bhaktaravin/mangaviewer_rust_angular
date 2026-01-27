use crate::cache::CacheService;
use crate::manga_service::{Manga, MangaListResponse};
use mongodb::bson::doc;
use serde::{Deserialize, Serialize};

/// Advanced search parameters
#[derive(Debug, Deserialize, Serialize)]
pub struct AdvancedSearchParams {
    // Basic search
    pub query: Option<String>,
    
    // Filters
    pub tags: Option<Vec<String>>,
    pub status: Option<Vec<String>>,
    pub author: Option<String>,
    pub artist: Option<String>,
    
    // Year range
    pub year_from: Option<u16>,
    pub year_to: Option<u16>,
    
    // Rating filter (minimum rating)
    pub min_rating: Option<f32>,
    
    // Sort options
    pub sort_by: Option<SortField>,
    pub sort_order: Option<SortOrder>,
    
    // Pagination
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum SortField {
    Title,
    UpdatedAt,
    CreatedAt,
    Rating,
    Popularity,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    Asc,
    Desc,
}

impl Default for AdvancedSearchParams {
    fn default() -> Self {
        Self {
            query: None,
            tags: None,
            status: None,
            author: None,
            artist: None,
            year_from: None,
            year_to: None,
            min_rating: None,
            sort_by: Some(SortField::UpdatedAt),
            sort_order: Some(SortOrder::Desc),
            page: Some(1),
            limit: Some(20),
        }
    }
}

/// Enhanced search service with caching
#[derive(Clone)]
pub struct SearchService {
    cache: Option<CacheService>,
}

impl SearchService {
    pub fn new(cache: Option<CacheService>) -> Self {
        Self { cache }
    }

    /// Perform advanced search with caching
    pub async fn advanced_search(
        &self,
        manga_service: &crate::manga_service::MangaService,
        params: AdvancedSearchParams,
    ) -> Result<MangaListResponse, Box<dyn std::error::Error>> {
        // Generate cache key from search params
        let cache_key = self.generate_cache_key(&params);
        
        // Try to get from cache
        if let Some(cache) = &self.cache {
            if let Ok(Some(cached)) = cache.get::<MangaListResponse>(&cache_key).await {
                tracing::info!("🎯 Returning cached search results");
                return Ok(cached);
            }
        }

        // Build MongoDB query
        let mut filter = doc! {};

        // Text search
        if let Some(query) = &params.query {
            if !query.is_empty() {
                filter.insert(
                    "$or",
                    vec![
                        doc! { "title": { "$regex": query, "$options": "i" } },
                        doc! { "description": { "$regex": query, "$options": "i" } },
                        doc! { "author": { "$regex": query, "$options": "i" } },
                    ],
                );
            }
        }

        // Tags filter
        if let Some(tags) = &params.tags {
            if !tags.is_empty() {
                filter.insert("tags", doc! { "$in": tags });
            }
        }

        // Status filter
        if let Some(statuses) = &params.status {
            if !statuses.is_empty() {
                filter.insert("status", doc! { "$in": statuses });
            }
        }

        // Author filter
        if let Some(author) = &params.author {
            filter.insert("author", doc! { "$regex": author, "$options": "i" });
        }

        // Artist filter
        if let Some(artist) = &params.artist {
            filter.insert("artist", doc! { "$regex": artist, "$options": "i" });
        }

        // Year range filter
        let mut year_filter = doc! {};
        if let Some(year_from) = params.year_from {
            year_filter.insert("$gte", year_from as i32);
        }
        if let Some(year_to) = params.year_to {
            year_filter.insert("$lte", year_to as i32);
        }
        if !year_filter.is_empty() {
            filter.insert("year", year_filter);
        }

        // Build sort document
        let sort_field = match params.sort_by.unwrap_or(SortField::UpdatedAt) {
            SortField::Title => "title",
            SortField::UpdatedAt => "updated_at",
            SortField::CreatedAt => "created_at",
            SortField::Rating => "rating",
            SortField::Popularity => "popularity",
        };

        let sort_direction = match params.sort_order.unwrap_or(SortOrder::Desc) {
            SortOrder::Asc => 1,
            SortOrder::Desc => -1,
        };

        let sort = doc! { sort_field: sort_direction };

        // Pagination
        let page = params.page.unwrap_or(1).max(1);
        let limit = params.limit.unwrap_or(20).min(100) as i64;
        let skip = ((page - 1) * limit as u32) as u64;

        // Execute query
        let collection = manga_service.manga_collection();
        
        let total_count = collection.count_documents(filter.clone()).await?;

        let mut cursor = collection
            .find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .await?;

        let mut manga_list = Vec::new();
        while cursor.advance().await? {
            manga_list.push(cursor.deserialize_current()?);
        }

        let response = MangaListResponse {
            success: true,
            manga: Some(manga_list),
            total_count: Some(total_count as i64),
            message: Some(format!("Found {} manga", total_count)),
        };

        // Cache the results (5 minutes)
        if let Some(cache) = &self.cache {
            let _ = cache.set(&cache_key, &response, 300).await;
        }

        Ok(response)
    }

    /// Generate cache key from search parameters
    fn generate_cache_key(&self, params: &AdvancedSearchParams) -> String {
        use sha2::{Digest, Sha256};
        
        // Serialize params to JSON
        let json = serde_json::to_string(params).unwrap_or_default();
        
        // Hash to create compact key
        let mut hasher = Sha256::new();
        hasher.update(json.as_bytes());
        let hash = format!("{:x}", hasher.finalize());
        
        format!("search:advanced:{}", &hash[..16])
    }

    /// Invalidate search cache (call after manga updates)
    pub async fn invalidate_search_cache(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(cache) = &self.cache {
            cache.delete_pattern("search:*").await?;
            tracing::info!("🗑️  Invalidated search cache");
        }
        Ok(())
    }
}

/// Auto-complete suggestions for search
pub async fn get_autocomplete_suggestions(
    manga_service: &crate::manga_service::MangaService,
    cache: &Option<CacheService>,
    query: &str,
    limit: u32,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    if query.len() < 2 {
        return Ok(Vec::new());
    }

    let cache_key = format!("autocomplete:{}", query);

    // Try cache first
    if let Some(cache) = cache {
        if let Ok(Some(cached)) = cache.get::<Vec<String>>(&cache_key).await {
            return Ok(cached);
        }
    }

    // Query database
    let collection = manga_service.manga_collection();
    let mut cursor = collection
        .find(doc! {
            "title": { "$regex": query, "$options": "i" }
        })
        .limit(limit as i64)
        .await?;

    let mut suggestions = Vec::new();
    while cursor.advance().await? {
        let manga: Manga = cursor.deserialize_current()?;
        if let Some(title) = manga.title {
            suggestions.push(title);
        }
    }

    // Cache for 10 minutes
    if let Some(cache) = cache {
        let _ = cache.set(&cache_key, &suggestions, 600).await;
    }

    Ok(suggestions)
}
