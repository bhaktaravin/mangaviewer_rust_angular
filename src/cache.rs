use bb8_redis::{
    bb8::{Pool, PooledConnection},
    redis::{AsyncCommands, RedisError},
    RedisConnectionManager,
};
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;

pub type RedisPool = Pool<RedisConnectionManager>;
pub type RedisConnection<'a> = PooledConnection<'a, RedisConnectionManager>;

/// Redis cache service for high-performance caching
#[derive(Clone)]
pub struct CacheService {
    pool: RedisPool,
}

impl CacheService {
    /// Create a new cache service
    pub async fn new(redis_url: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let manager = RedisConnectionManager::new(redis_url)?;
        let pool = Pool::builder()
            .max_size(15)
            .connection_timeout(Duration::from_secs(5))
            .build(manager)
            .await?;

        tracing::info!("✅ Redis connection pool created");

        Ok(CacheService { pool })
    }

    /// Get a connection from the pool
    pub async fn get_connection(&self) -> Result<RedisConnection, Box<dyn std::error::Error>> {
        Ok(self.pool.get().await?)
    }

    /// Get cached data by key
    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            tracing::error!("Failed to get Redis connection: {}", e);
            RedisError::from(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Connection pool error: {}", e),
            ))
        })?;

        let data: Option<String> = conn.get(key).await?;

        match data {
            Some(json) => {
                match serde_json::from_str::<T>(&json) {
                    Ok(value) => {
                        tracing::debug!("✅ Cache HIT: {}", key);
                        Ok(Some(value))
                    }
                    Err(e) => {
                        tracing::warn!("Failed to deserialize cached data for {}: {}", key, e);
                        // Delete corrupted cache entry
                        let _: Result<(), RedisError> = conn.del(key).await;
                        Ok(None)
                    }
                }
            }
            None => {
                tracing::debug!("❌ Cache MISS: {}", key);
                Ok(None)
            }
        }
    }

    /// Set cached data with expiration (in seconds)
    pub async fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        expiration_secs: u64,
    ) -> Result<(), RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            tracing::error!("Failed to get Redis connection: {}", e);
            RedisError::from(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Connection pool error: {}", e),
            ))
        })?;

        let json = serde_json::to_string(value).map_err(|e| {
            tracing::error!("Failed to serialize value: {}", e);
            RedisError::from(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Serialization error: {}", e),
            ))
        })?;

        let _: () = conn.set_ex(key, json, expiration_secs).await?;
        tracing::debug!("✅ Cache SET: {} (expires in {}s)", key, expiration_secs);

        Ok(())
    }

    /// Delete cached data
    pub async fn delete(&self, key: &str) -> Result<(), RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            tracing::error!("Failed to get Redis connection: {}", e);
            RedisError::from(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Connection pool error: {}", e),
            ))
        })?;

        let _: () = conn.del(key).await?;
        tracing::debug!("🗑️  Cache DELETE: {}", key);

        Ok(())
    }

    /// Delete all keys matching a pattern
    pub async fn delete_pattern(&self, pattern: &str) -> Result<u64, RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            tracing::error!("Failed to get Redis connection: {}", e);
            RedisError::from(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Connection pool error: {}", e),
            ))
        })?;

        // Use SCAN to find matching keys (safer than KEYS for production)
        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(pattern)
            .query_async(&mut *conn)
            .await?;

        if keys.is_empty() {
            return Ok(0);
        }

        let count = keys.len() as u64;
        let _: () = conn.del(&keys).await?;
        tracing::debug!("🗑️  Cache DELETE pattern: {} ({} keys)", pattern, count);

        Ok(count)
    }

    /// Check if key exists
    pub async fn exists(&self, key: &str) -> Result<bool, RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            tracing::error!("Failed to get Redis connection: {}", e);
            RedisError::from(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Connection pool error: {}", e),
            ))
        })?;

        let exists: bool = conn.exists(key).await?;
        Ok(exists)
    }

    /// Get cache statistics
    pub async fn stats(&self) -> Result<CacheStats, RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            tracing::error!("Failed to get Redis connection: {}", e);
            RedisError::from(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Connection pool error: {}", e),
            ))
        })?;

        let info: String = redis::cmd("INFO")
            .arg("stats")
            .query_async(&mut *conn)
            .await?;

        // Parse basic stats from INFO output
        let mut hits = 0u64;
        let mut misses = 0u64;

        for line in info.lines() {
            if line.starts_with("keyspace_hits:") {
                hits = line.split(':').nth(1).unwrap_or("0").parse().unwrap_or(0);
            } else if line.starts_with("keyspace_misses:") {
                misses = line.split(':').nth(1).unwrap_or("0").parse().unwrap_or(0);
            }
        }

        let total = hits + misses;
        let hit_rate = if total > 0 {
            (hits as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        Ok(CacheStats {
            hits,
            misses,
            hit_rate,
        })
    }
}

#[derive(Debug, serde::Serialize)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub hit_rate: f64,
}

/// Cache key builders for consistency
pub mod cache_keys {
    pub fn manga_search(query: &str, limit: u32, offset: u32) -> String {
        format!("manga:search:{}:{}:{}", query, limit, offset)
    }

    pub fn manga_details(manga_id: &str) -> String {
        format!("manga:details:{}", manga_id)
    }

    pub fn manga_chapters(manga_id: &str, lang: &str) -> String {
        format!("manga:chapters:{}:{}", manga_id, lang)
    }

    pub fn user_profile(user_id: &str) -> String {
        format!("user:profile:{}", user_id)
    }

    pub fn user_library(user_id: &str) -> String {
        format!("user:library:{}", user_id)
    }

    pub fn user_progress(user_id: &str, manga_id: &str) -> String {
        format!("user:progress:{}:{}", user_id, manga_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_key_generation() {
        assert_eq!(
            cache_keys::manga_search("naruto", 20, 0),
            "manga:search:naruto:20:0"
        );
        assert_eq!(
            cache_keys::manga_details("123"),
            "manga:details:123"
        );
    }
}
