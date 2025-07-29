use mongodb::{Database, Client, Collection};
use mongodb::bson::{doc, oid::ObjectId};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Manga {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub manga_id: Option<String>,  // MangaDx ID or similar - now optional
    pub title: Option<String>,     // Now optional
    pub description: Option<String>,
    pub author: Option<String>,
    pub artist: Option<String>,
    pub status: Option<String>,    // Now optional
    pub tags: Option<Vec<String>>, // Now optional
    pub cover_art: Option<String>,
    pub chapters: Option<Vec<Chapter>>, // Now optional
    pub created_at: Option<String>,     // Now optional
    pub updated_at: Option<String>,     // Now optional
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chapter {
    pub chapter_id: String,
    pub chapter_number: String,
    pub title: Option<String>,
    pub pages: Vec<String>, // URLs to page images
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MangaListResponse {
    pub success: bool,
    pub manga: Option<Vec<Manga>>,
    pub total_count: Option<i64>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MangaResponse {
    pub success: bool,
    pub manga: Option<Manga>,
    pub message: Option<String>,
}

#[derive(Clone)]
pub struct MangaService {
    db: Database,
}

impl MangaService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let mongodb_uri = env::var("MONGODB_URI")
            .map_err(|_| "MONGODB_URI environment variable not set")?;
        
        // Remove the default database from URI and use the manga database
        let base_uri = if mongodb_uri.contains('/') {
            mongodb_uri.split('/').take(3).collect::<Vec<&str>>().join("/")
        } else {
            mongodb_uri.clone()
        };

        let manga_database_name = env::var("MANGA_DATABASE_NAME")
            .unwrap_or_else(|_| "manga".to_string());

        println!("🔗 Connecting to Manga Database...");
        println!("📍 URI: {}", base_uri.chars().take(20).collect::<String>() + "...");
        println!("🗄️  Manga Database: {}", manga_database_name);

        let client = Client::with_uri_str(&mongodb_uri).await
            .map_err(|e| {
                println!("❌ Failed to create MongoDB client for manga: {}", e);
                e
            })?;

        let database = client.database(&manga_database_name);
        println!("📚 Selected manga database: {}", manga_database_name);

        // Create indexes for better performance
        let manga_collection = database.collection::<Manga>("manga");
        println!("🔧 Creating manga database indexes...");
        
        match Self::create_indexes(&manga_collection).await {
            Ok(_) => println!("✅ Manga database indexes created successfully"),
            Err(e) => println!("⚠️  Warning: Failed to create manga indexes: {}", e),
        }

        println!("🚀 MangaService initialized successfully");

        Ok(MangaService {
            db: database,
        })
    }

    async fn create_indexes(collection: &Collection<Manga>) -> Result<(), Box<dyn std::error::Error>> {
        use mongodb::{IndexModel, options::IndexOptions};
        use mongodb::bson::doc;

        let manga_id_index = IndexModel::builder()
            .keys(doc! { "manga_id": 1 })
            .options(IndexOptions::builder().sparse(true).build()) // Use sparse instead of unique
            .build();

        let title_index = IndexModel::builder()
            .keys(doc! { "title": "text" })
            .build();

        let tags_index = IndexModel::builder()
            .keys(doc! { "tags": 1 })
            .build();

        collection.create_indexes(vec![manga_id_index, title_index, tags_index]).await?;
        Ok(())
    }

    fn manga_collection(&self) -> Collection<Manga> {
        self.db.collection("manga")
    }

    pub async fn save_manga(&self, manga: Manga) -> Result<MangaResponse, Box<dyn std::error::Error>> {
        let collection = self.manga_collection();
        
        let title_display = manga.title.as_deref().unwrap_or("Untitled");
        println!("💾 Saving manga: {}", title_display);

        // Check if manga already exists
        let existing = collection.find_one(
            doc! { "manga_id": &manga.manga_id }
        ).await?;

        if let Some(_existing_manga) = existing {
            // Update existing manga
            let result = collection.replace_one(
                doc! { "manga_id": &manga.manga_id },
                &manga
            ).await?;

            println!("📝 Updated existing manga: {} (matched: {})", title_display, result.matched_count);
        } else {
            // Insert new manga
            let result = collection.insert_one(&manga).await?;
            println!("✅ Inserted new manga: {} with ID: {:?}", title_display, result.inserted_id);
        }

        Ok(MangaResponse {
            success: true,
            manga: Some(manga),
            message: Some("Manga saved successfully".to_string()),
        })
    }

    pub async fn get_manga(&self, manga_id: &str) -> Result<MangaResponse, Box<dyn std::error::Error>> {
        let collection = self.manga_collection();
        
        let manga = collection.find_one(
            doc! { "manga_id": manga_id }
        ).await?;

        match manga {
            Some(manga) => Ok(MangaResponse {
                success: true,
                manga: Some(manga),
                message: Some("Manga found".to_string()),
            }),
            None => Ok(MangaResponse {
                success: false,
                manga: None,
                message: Some("Manga not found".to_string()),
            }),
        }
    }

    pub async fn list_manga(&self, page: Option<i64>, limit: Option<i64>) -> Result<MangaListResponse, Box<dyn std::error::Error>> {
        let collection = self.manga_collection();
        
        // Get total count
        let total_count = collection.count_documents(doc! {}).await?;
        
        // Apply pagination
        let page = page.unwrap_or(1).max(1);
        let limit = limit.unwrap_or(20).min(100); // Max 100 manga per page
        let skip = (page - 1) * limit;
        
        let mut cursor = collection.find(doc! {})
            .sort(doc! {"updated_at": -1})
            .skip(skip as u64)
            .limit(limit)
            .await?;

        let mut manga_list = Vec::new();
        while cursor.advance().await? {
            let manga = cursor.deserialize_current()?;
            manga_list.push(manga);
        }

        Ok(MangaListResponse {
            success: true,
            manga: Some(manga_list.clone()),
            total_count: Some(total_count as i64),
            message: Some(format!("Retrieved {} manga", manga_list.len())),
        })
    }

    pub async fn search_manga(&self, query: &str) -> Result<MangaListResponse, Box<dyn std::error::Error>> {
        let collection = self.manga_collection();
        
        let search_filter = doc! {
            "$or": [
                { "title": { "$regex": query, "$options": "i" } },
                { "tags": { "$in": [query] } },
                { "author": { "$regex": query, "$options": "i" } }
            ]
        };
        
        let mut cursor = collection.find(search_filter).await?;
        let mut manga_list = Vec::new();
        
        while cursor.advance().await? {
            let manga = cursor.deserialize_current()?;
            manga_list.push(manga);
        }

        Ok(MangaListResponse {
            success: true,
            manga: Some(manga_list.clone()),
            total_count: Some(manga_list.len() as i64),
            message: Some(format!("Found {} manga matching '{}'", manga_list.len(), query)),
        })
    }
}

// HTTP Handlers for manga operations
use axum::{
    extract::{State, Path, Query},
    response::Json,
    http::StatusCode,
};

#[derive(Deserialize)]
pub struct MangaQuery {
    page: Option<i64>,
    limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
}

pub async fn save_manga_handler(
    State(manga_service): State<MangaService>,
    Json(manga): Json<Manga>,
) -> Result<Json<MangaResponse>, StatusCode> {
    match manga_service.save_manga(manga).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn get_manga_handler(
    State(manga_service): State<MangaService>,
    Path(manga_id): Path<String>,
) -> Result<Json<MangaResponse>, StatusCode> {
    match manga_service.get_manga(&manga_id).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn list_manga_handler(
    State(manga_service): State<MangaService>,
    Query(params): Query<MangaQuery>,
) -> Result<Json<MangaListResponse>, StatusCode> {
    println!("📖 List manga endpoint called with params: page={:?}, limit={:?}", params.page, params.limit);
    match manga_service.list_manga(params.page, params.limit).await {
        Ok(response) => {
            println!("✅ List manga successful: {} manga found", response.total_count.unwrap_or(0));
            Ok(Json(response))
        },
        Err(e) => {
            println!("❌ List manga error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn search_manga_handler(
    State(manga_service): State<MangaService>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<MangaListResponse>, StatusCode> {
    match manga_service.search_manga(&params.q).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
