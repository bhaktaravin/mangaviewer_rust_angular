use crate::api::{FilteredMangaResponse, MangaData, MangaDexClient, MangaDexClientError, MangaDexResponse};
use crate::cache::{cache_keys, CacheService};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Cache TTL constants (in seconds)
pub mod cache_ttl {
    pub const MANGA_SEARCH: u64 = 300; // 5 minutes
    pub const MANGA_DETAILS: u64 = 1800; // 30 minutes
    pub const MANGA_CHAPTERS: u64 = 600; // 10 minutes
}

/// In-flight request tracker to prevent duplicate concurrent requests
type InFlightRequests = Arc<Mutex<HashMap<String, Arc<tokio::sync::Notify>>>>;

/// Cached MangaDex client with Redis caching and request deduplication
#[derive(Clone)]
pub struct CachedMangaDexClient {
    client: MangaDexClient,
    cache: Option<CacheService>,
    in_flight: InFlightRequests,
}

impl CachedMangaDexClient {
    pub fn new(cache: Option<CacheService>) -> Self {
        Self {
            client: MangaDexClient::new(),
            cache,
            in_flight: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Get manga by ID with caching
    pub async fn get_manga(&self, id: &str) -> Result<MangaData, MangaDexClientError> {
        let cache_key = cache_keys::manga_details(id);

        // Try cache first
        if let Some(cache) = &self.cache {
            if let Ok(Some(cached)) = cache.get::<MangaData>(&cache_key).await {
                tracing::info!("✅ Cache HIT: manga details for {}", id);
                return Ok(cached);
            }
        }

        // Check if request is already in-flight
        let notify = {
            let mut in_flight = self.in_flight.lock().await;
            if let Some(existing) = in_flight.get(&cache_key) {
                tracing::debug!("⏳ Request already in-flight for {}, waiting...", id);
                existing.clone()
            } else {
                let notify = Arc::new(tokio::sync::Notify::new());
                in_flight.insert(cache_key.clone(), notify.clone());
                notify
            }
        };

        // If we got an existing notify, wait for it
        if Arc::strong_count(&notify) > 1 {
            notify.notified().await;
            // Try cache again after waiting
            if let Some(cache) = &self.cache {
                if let Ok(Some(cached)) = cache.get::<MangaData>(&cache_key).await {
                    return Ok(cached);
                }
            }
        }

        // Fetch from API
        tracing::info!("❌ Cache MISS: fetching manga details for {} from API", id);
        let result = self.client.get_manga(id).await;

        // Cache successful result
        if let Ok(ref data) = result {
            if let Some(cache) = &self.cache {
                if let Err(e) = cache.set(&cache_key, data, cache_ttl::MANGA_DETAILS).await {
                    tracing::warn!("Failed to cache manga details: {}", e);
                }
            }
        }

        // Notify waiting requests and cleanup
        {
            let mut in_flight = self.in_flight.lock().await;
            in_flight.remove(&cache_key);
        }
        notify.notify_waiters();

        result
    }

    /// Search manga with caching
    pub async fn search_manga(
        &self,
        title: &str,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<MangaDexResponse, MangaDexClientError> {
        let limit = limit.unwrap_or(20);
        let offset = offset.unwrap_or(0);
        let cache_key = cache_keys::manga_search(title, limit, offset);

        // Try cache first
        if let Some(cache) = &self.cache {
            if let Ok(Some(cached)) = cache.get::<MangaDexResponse>(&cache_key).await {
                tracing::info!("✅ Cache HIT: search for '{}'", title);
                return Ok(cached);
            }
        }

        // Check if request is already in-flight
        let notify = {
            let mut in_flight = self.in_flight.lock().await;
            if let Some(existing) = in_flight.get(&cache_key) {
                tracing::debug!("⏳ Search request already in-flight for '{}', waiting...", title);
                existing.clone()
            } else {
                let notify = Arc::new(tokio::sync::Notify::new());
                in_flight.insert(cache_key.clone(), notify.clone());
                notify
            }
        };

        // If we got an existing notify, wait for it
        if Arc::strong_count(&notify) > 1 {
            notify.notified().await;
            // Try cache again after waiting
            if let Some(cache) = &self.cache {
                if let Ok(Some(cached)) = cache.get::<MangaDexResponse>(&cache_key).await {
                    return Ok(cached);
                }
            }
        }

        // Fetch from API
        tracing::info!("❌ Cache MISS: searching for '{}' from API", title);
        let result = self.client.search_manga(title, Some(limit), Some(offset)).await;

        // Cache successful result
        if let Ok(ref data) = result {
            if let Some(cache) = &self.cache {
                if let Err(e) = cache.set(&cache_key, data, cache_ttl::MANGA_SEARCH).await {
                    tracing::warn!("Failed to cache search results: {}", e);
                }
            }
        }

        // Notify waiting requests and cleanup
        {
            let mut in_flight = self.in_flight.lock().await;
            in_flight.remove(&cache_key);
        }
        notify.notify_waiters();

        result
    }

    /// Search manga with English filtering and caching
    pub async fn search_manga_english_filtered(
        &self,
        title: &str,
        limit: Option<u32>,
        offset: Option<u32>,
        include_non_english: bool,
    ) -> Result<FilteredMangaResponse, MangaDexClientError> {
        let limit = limit.unwrap_or(20);
        let offset = offset.unwrap_or(0);
        
        // Create cache key with filter flag
        let cache_key = format!(
            "manga:search:filtered:{}:{}:{}:{}",
            title, limit, offset, include_non_english
        );

        // Try cache first
        if let Some(cache) = &self.cache {
            if let Ok(Some(cached)) = cache.get::<FilteredMangaResponse>(&cache_key).await {
                tracing::info!("✅ Cache HIT: filtered search for '{}'", title);
                return Ok(cached);
            }
        }

        // Check if request is already in-flight
        let notify = {
            let mut in_flight = self.in_flight.lock().await;
            if let Some(existing) = in_flight.get(&cache_key) {
                tracing::debug!("⏳ Filtered search already in-flight for '{}', waiting...", title);
                existing.clone()
            } else {
                let notify = Arc::new(tokio::sync::Notify::new());
                in_flight.insert(cache_key.clone(), notify.clone());
                notify
            }
        };

        // If we got an existing notify, wait for it
        if Arc::strong_count(&notify) > 1 {
            notify.notified().await;
            // Try cache again after waiting
            if let Some(cache) = &self.cache {
                if let Ok(Some(cached)) = cache.get::<FilteredMangaResponse>(&cache_key).await {
                    return Ok(cached);
                }
            }
        }

        // Fetch from API
        tracing::info!("❌ Cache MISS: filtered search for '{}' from API", title);
        let result = self.client
            .search_manga_english_filtered(title, Some(limit), Some(offset), include_non_english)
            .await;

        // Cache successful result
        if let Ok(ref data) = result {
            if let Some(cache) = &self.cache {
                if let Err(e) = cache.set(&cache_key, data, cache_ttl::MANGA_SEARCH).await {
                    tracing::warn!("Failed to cache filtered search results: {}", e);
                }
            }
        }

        // Notify waiting requests and cleanup
        {
            let mut in_flight = self.in_flight.lock().await;
            in_flight.remove(&cache_key);
        }
        notify.notify_waiters();

        result
    }

    /// Cache chapters for a manga
    pub async fn cache_chapters(
        &self,
        manga_id: &str,
        lang: &str,
        chapters: &serde_json::Value,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(cache) = &self.cache {
            let cache_key = cache_keys::manga_chapters(manga_id, lang);
            cache.set(&cache_key, chapters, cache_ttl::MANGA_CHAPTERS).await?;
            tracing::debug!("✅ Cached chapters for manga {} ({})", manga_id, lang);
        }
        Ok(())
    }

    /// Get cached chapters
    pub async fn get_cached_chapters(
        &self,
        manga_id: &str,
        lang: &str,
    ) -> Result<Option<serde_json::Value>, Box<dyn std::error::Error>> {
        if let Some(cache) = &self.cache {
            let cache_key = cache_keys::manga_chapters(manga_id, lang);
            let result = cache.get::<serde_json::Value>(&cache_key).await?;
            if result.is_some() {
                tracing::info!("✅ Cache HIT: chapters for manga {} ({})", manga_id, lang);
            }
            return Ok(result);
        }
        Ok(None)
    }

    /// Invalidate cache for a specific manga
    pub async fn invalidate_manga(&self, manga_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(cache) = &self.cache {
            let pattern = format!("manga:*:{}*", manga_id);
            let count = cache.delete_pattern(&pattern).await?;
            tracing::info!("🗑️  Invalidated {} cache entries for manga {}", count, manga_id);
        }
        Ok(())
    }

    /// Invalidate all search caches
    pub async fn invalidate_search_cache(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(cache) = &self.cache {
            let count = cache.delete_pattern("manga:search:*").await?;
            tracing::info!("🗑️  Invalidated {} search cache entries", count);
        }
        Ok(())
    }

    /// Get cache statistics
    pub async fn cache_stats(&self) -> Result<Option<crate::cache::CacheStats>, Box<dyn std::error::Error>> {
        if let Some(cache) = &self.cache {
            let stats = cache.stats().await?;
            return Ok(Some(stats));
        }
        Ok(None)
    }

    /// Check if caching is enabled
    pub fn is_caching_enabled(&self) -> bool {
        self.cache.is_some()
    }
}

/// Generate a hash for complex query parameters
pub fn hash_query(query: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(query.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_query() {
        let query1 = "naruto";
        let query2 = "naruto";
        let query3 = "bleach";

        assert_eq!(hash_query(query1), hash_query(query2));
        assert_ne!(hash_query(query1), hash_query(query3));
    }

    #[tokio::test]
    async fn test_cached_client_without_cache() {
        let client = CachedMangaDexClient::new(None);
        assert!(!client.is_caching_enabled());
    }
}
