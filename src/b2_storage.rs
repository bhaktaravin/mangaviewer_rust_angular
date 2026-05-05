use bytes::Bytes;
use rusoto_core::{ByteStream, Region};
use rusoto_credential::StaticProvider;
use rusoto_s3::{PutObjectRequest, HeadObjectRequest, DeleteObjectRequest, S3Client, S3};

/// Backblaze B2 Storage Service
/// 
/// Provides S3-compatible storage for manga chapter images using Backblaze B2.
/// Features:
/// - Upload manga chapter images
/// - Generate public URLs for serving images
/// - Check if images exist in storage
/// - Delete images when needed
#[derive(Clone)]
pub struct B2StorageService {
    client: S3Client,
    bucket_name: String,
    endpoint_url: String,
    public_url: String,
}

impl B2StorageService {
    /// Create a new B2 Storage Service
    /// 
    /// # Environment Variables Required:
    /// - B2_ENDPOINT: Backblaze B2 endpoint (e.g., s3.us-west-004.backblazeb2.com)
    /// - B2_REGION: Region (e.g., us-west-004)
    /// - B2_ACCESS_KEY_ID: Application Key ID
    /// - B2_SECRET_ACCESS_KEY: Application Key
    /// - B2_BUCKET_NAME: Bucket name
    /// - B2_PUBLIC_URL: Public URL for serving (e.g., https://f004.backblazeb2.com/file/bucket-name)
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let endpoint = std::env::var("B2_ENDPOINT")
            .map_err(|_| "B2_ENDPOINT not set")?;
        let region_name = std::env::var("B2_REGION")
            .unwrap_or_else(|_| "us-west-004".to_string());
        let access_key_id = std::env::var("B2_ACCESS_KEY_ID")
            .map_err(|_| "B2_ACCESS_KEY_ID not set")?;
        let secret_access_key = std::env::var("B2_SECRET_ACCESS_KEY")
            .map_err(|_| "B2_SECRET_ACCESS_KEY not set")?;
        let bucket_name = std::env::var("B2_BUCKET_NAME")
            .map_err(|_| "B2_BUCKET_NAME not set")?;
        let public_url = std::env::var("B2_PUBLIC_URL")
            .map_err(|_| "B2_PUBLIC_URL not set")?;

        // Create credentials
        let credentials = StaticProvider::new_minimal(access_key_id, secret_access_key);

        // Create custom region for B2
        let region = Region::Custom {
            name: region_name,
            endpoint: format!("https://{}", endpoint),
        };

        // Create S3 client
        let client = S3Client::new_with(
            rusoto_core::HttpClient::new().expect("Failed to create HTTP client"),
            credentials,
            region,
        );

        tracing::info!("✅ Backblaze B2 storage initialized");
        tracing::info!("   Bucket: {}", bucket_name);
        tracing::info!("   Endpoint: {}", endpoint);

        Ok(Self {
            client,
            bucket_name,
            endpoint_url: endpoint,
            public_url,
        })
    }

    /// Upload an image to B2
    /// 
    /// # Arguments
    /// - `key`: Object key (path) in bucket, e.g., "manga/naruto/chapter-1/page-001.jpg"
    /// - `data`: Image bytes
    /// - `content_type`: MIME type (e.g., "image/jpeg", "image/png", "image/webp")
    pub async fn upload_image(
        &self,
        key: &str,
        data: Bytes,
        content_type: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let put_request = PutObjectRequest {
            bucket: self.bucket_name.clone(),
            key: key.to_string(),
            body: Some(ByteStream::from(data.to_vec())),
            content_type: Some(content_type.to_string()),
            ..Default::default()
        };

        self.client.put_object(put_request).await?;

        let public_url = self.get_public_url(key);
        tracing::info!("✅ Uploaded to B2: {}", key);

        Ok(public_url)
    }

    /// Check if an object exists in B2
    pub async fn exists(&self, key: &str) -> bool {
        let head_request = HeadObjectRequest {
            bucket: self.bucket_name.clone(),
            key: key.to_string(),
            ..Default::default()
        };

        self.client.head_object(head_request).await.is_ok()
    }

    /// Get the public URL for an object
    pub fn get_public_url(&self, key: &str) -> String {
        format!("{}/{}", self.public_url.trim_end_matches('/'), key)
    }

    /// Delete an object from B2
    pub async fn delete_image(&self, key: &str) -> Result<(), Box<dyn std::error::Error>> {
        let delete_request = DeleteObjectRequest {
            bucket: self.bucket_name.clone(),
            key: key.to_string(),
            ..Default::default()
        };

        self.client.delete_object(delete_request).await?;

        tracing::info!("🗑️  Deleted from B2: {}", key);
        Ok(())
    }

    /// Generate a storage key for a manga chapter page
    /// 
    /// Format: manga/{manga_id}/chapter-{chapter_num}/page-{page_num}.{ext}
    pub fn generate_key(
        manga_id: &str,
        chapter_num: &str,
        page_num: u32,
        extension: &str,
    ) -> String {
        let safe_manga_id = sanitize_path(manga_id);
        let safe_chapter = sanitize_path(chapter_num);
        format!(
            "manga/{}/chapter-{}/page-{:03}.{}",
            safe_manga_id, safe_chapter, page_num, extension
        )
    }

    /// Upload a complete chapter to B2
    /// 
    /// Returns a vector of public URLs for each page
    pub async fn upload_chapter(
        &self,
        manga_id: &str,
        chapter_num: &str,
        pages: Vec<(Bytes, String)>, // (image_data, extension)
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let mut urls = Vec::new();

        for (page_num, (data, extension)) in pages.into_iter().enumerate() {
            let key = Self::generate_key(manga_id, chapter_num, (page_num + 1) as u32, &extension);
            
            // Determine content type from extension
            let content_type = match extension.to_lowercase().as_str() {
                "jpg" | "jpeg" => "image/jpeg",
                "png" => "image/png",
                "webp" => "image/webp",
                "gif" => "image/gif",
                _ => "application/octet-stream",
            };

            let url = self.upload_image(&key, data, content_type).await?;
            urls.push(url);
        }

        tracing::info!(
            "✅ Uploaded chapter {} of manga {} ({} pages)",
            chapter_num,
            manga_id,
            urls.len()
        );

        Ok(urls)
    }

    /// Check if a complete chapter exists in B2
    pub async fn chapter_exists(
        &self,
        manga_id: &str,
        chapter_num: &str,
        page_count: u32,
    ) -> bool {
        // Check if first and last pages exist
        let first_key = Self::generate_key(manga_id, chapter_num, 1, "jpg");
        let last_key = Self::generate_key(manga_id, chapter_num, page_count, "jpg");

        self.exists(&first_key).await && self.exists(&last_key).await
    }

    /// Get URLs for all pages in a chapter
    pub fn get_chapter_urls(
        &self,
        manga_id: &str,
        chapter_num: &str,
        page_count: u32,
        extension: &str,
    ) -> Vec<String> {
        (1..=page_count)
            .map(|page_num| {
                let key = Self::generate_key(manga_id, chapter_num, page_num, extension);
                self.get_public_url(&key)
            })
            .collect()
    }

    /// Delete a complete chapter from B2
    pub async fn delete_chapter(
        &self,
        manga_id: &str,
        chapter_num: &str,
        page_count: u32,
        extension: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for page_num in 1..=page_count {
            let key = Self::generate_key(manga_id, chapter_num, page_num, extension);
            if let Err(e) = self.delete_image(&key).await {
                tracing::warn!("Failed to delete {}: {}", key, e);
            }
        }

        tracing::info!(
            "🗑️  Deleted chapter {} of manga {} ({} pages)",
            chapter_num,
            manga_id,
            page_count
        );

        Ok(())
    }

    /// Get bucket name
    pub fn bucket_name(&self) -> &str {
        &self.bucket_name
    }

    /// Get endpoint URL
    pub fn endpoint_url(&self) -> &str {
        &self.endpoint_url
    }
}

/// Sanitize a path component to be safe for S3 keys
fn sanitize_path(input: &str) -> String {
    input
        .chars()
        .map(|c| match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' => c,
            _ => '_',
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_key() {
        let key = B2StorageService::generate_key("naruto-123", "1", 1, "jpg");
        assert_eq!(key, "manga/naruto-123/chapter-1/page-001.jpg");

        let key = B2StorageService::generate_key("one piece", "100.5", 42, "png");
        assert_eq!(key, "manga/one_piece/chapter-100_5/page-042.png");
    }

    #[test]
    fn test_sanitize_path() {
        assert_eq!(sanitize_path("naruto"), "naruto");
        assert_eq!(sanitize_path("one piece"), "one_piece");
        assert_eq!(sanitize_path("chapter-1.5"), "chapter-1_5");
        assert_eq!(sanitize_path("test/path\\bad"), "test_path_bad");
    }

    #[test]
    fn test_get_chapter_urls() {
        // This test would require a mock B2StorageService
        // For now, just test the key generation logic
        let keys: Vec<String> = (1..=3)
            .map(|page| B2StorageService::generate_key("test", "1", page, "jpg"))
            .collect();

        assert_eq!(keys.len(), 3);
        assert_eq!(keys[0], "manga/test/chapter-1/page-001.jpg");
        assert_eq!(keys[2], "manga/test/chapter-1/page-003.jpg");
    }
}
