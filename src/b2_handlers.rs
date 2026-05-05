use crate::api::ApiError;
use crate::b2_storage::B2StorageService;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bytes::Bytes;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct UploadChapterQuery {
    pub manga_id: String,
    pub chapter_id: String,
    pub chapter_number: String,
}

#[derive(Deserialize)]
pub struct GetChapterQuery {
    pub manga_id: String,
    pub chapter_number: String,
    pub page_count: Option<u32>,
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub success: bool,
    pub message: String,
    pub urls: Vec<String>,
    pub page_count: usize,
}

#[derive(Serialize)]
pub struct ChapterUrlsResponse {
    pub success: bool,
    pub manga_id: String,
    pub chapter_number: String,
    pub urls: Vec<String>,
    pub page_count: usize,
    pub cached: bool,
}

/// Upload a chapter from MangaDex to B2
/// 
/// This endpoint:
/// 1. Fetches chapter images from MangaDex
/// 2. Uploads them to Backblaze B2
/// 3. Returns public URLs for serving
pub async fn upload_chapter_to_b2_handler(
    State(b2_service): State<B2StorageService>,
    Query(params): Query<UploadChapterQuery>,
) -> impl IntoResponse {
    // First, get the chapter images from MangaDex
    let client = Client::new();
    
    // Get at-home server URL
    let server_url = format!(
        "https://api.mangadex.org/at-home/server/{}",
        params.chapter_id
    );

    let download_response = match client
        .get(&server_url)
        .header("User-Agent", "mangaviewer/1.0")
        .send()
        .await
    {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => json,
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        error: "Failed to parse MangaDex response".to_string(),
                        message: Some(e.to_string()),
                    }),
                )
                    .into_response()
            }
        },
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ApiError {
                    error: "Failed to fetch from MangaDex".to_string(),
                    message: Some(e.to_string()),
                }),
            )
                .into_response()
        }
    };

    let base_url = download_response["baseUrl"].as_str().unwrap_or("");
    let chapter_hash = download_response["chapter"]["hash"].as_str().unwrap_or("");
    let empty_vec = vec![];
    let images = download_response["chapter"]["data"]
        .as_array()
        .unwrap_or(&empty_vec);

    if images.is_empty() {
        return (
            StatusCode::NOT_FOUND,
            Json(ApiError {
                error: "No images found for this chapter".to_string(),
                message: None,
            }),
        )
            .into_response();
    }

    // Download and upload each image
    let mut pages = Vec::new();
    for image in images {
        if let Some(filename) = image.as_str() {
            let image_url = format!("{}/data/{}/{}", base_url, chapter_hash, filename);
            
            match client
                .get(&image_url)
                .header("User-Agent", "mangaviewer/1.0")
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.bytes().await {
                            Ok(bytes) => {
                                // Get extension from filename
                                let extension = std::path::Path::new(filename)
                                    .extension()
                                    .and_then(|ext| ext.to_str())
                                    .unwrap_or("jpg")
                                    .to_string();
                                
                                pages.push((bytes, extension));
                            }
                            Err(e) => {
                                tracing::warn!("Failed to read image bytes: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to download image: {}", e);
                }
            }
        }
    }

    if pages.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "Failed to download any images".to_string(),
                message: None,
            }),
        )
            .into_response();
    }

    // Upload to B2
    match b2_service
        .upload_chapter(&params.manga_id, &params.chapter_number, pages)
        .await
    {
        Ok(urls) => {
            let response = UploadResponse {
                success: true,
                message: format!("Successfully uploaded {} pages", urls.len()),
                page_count: urls.len(),
                urls,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to upload to B2: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    error: "Failed to upload to B2".to_string(),
                    message: Some(e.to_string()),
                }),
            )
                .into_response()
        }
    }
}

/// Get chapter URLs from B2 (if exists) or MangaDex (fallback)
/// 
/// This endpoint checks if the chapter is cached in B2 first,
/// and falls back to MangaDex if not found.
pub async fn get_chapter_urls_handler(
    State(b2_service): State<B2StorageService>,
    Query(params): Query<GetChapterQuery>,
) -> impl IntoResponse {
    let page_count = params.page_count.unwrap_or(50); // Default to 50 pages max

    // Check if chapter exists in B2
    if b2_service
        .chapter_exists(&params.manga_id, &params.chapter_number, page_count)
        .await
    {
        // Return B2 URLs
        let urls = b2_service.get_chapter_urls(
            &params.manga_id,
            &params.chapter_number,
            page_count,
            "jpg", // Default to jpg, could be made configurable
        );

        let response = ChapterUrlsResponse {
            success: true,
            manga_id: params.manga_id,
            chapter_number: params.chapter_number,
            page_count: urls.len(),
            urls,
            cached: true,
        };

        return (StatusCode::OK, Json(response)).into_response();
    }

    // Chapter not in B2, return message to upload first
    (
        StatusCode::NOT_FOUND,
        Json(ApiError {
            error: "Chapter not found in storage".to_string(),
            message: Some("Use /api/b2/upload to cache this chapter first".to_string()),
        }),
    )
        .into_response()
}

/// Check if a chapter exists in B2 storage
#[derive(Serialize)]
pub struct ChapterExistsResponse {
    pub exists: bool,
    pub manga_id: String,
    pub chapter_number: String,
}

pub async fn check_chapter_exists_handler(
    State(b2_service): State<B2StorageService>,
    Path((manga_id, chapter_number)): Path<(String, String)>,
) -> impl IntoResponse {
    let exists = b2_service
        .chapter_exists(&manga_id, &chapter_number, 50)
        .await;

    let response = ChapterExistsResponse {
        exists,
        manga_id,
        chapter_number,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// Get B2 storage statistics
#[derive(Serialize)]
pub struct B2StatsResponse {
    pub enabled: bool,
    pub bucket_name: String,
    pub endpoint: String,
}

pub async fn b2_stats_handler(State(b2_service): State<B2StorageService>) -> impl IntoResponse {
    let response = B2StatsResponse {
        enabled: true,
        bucket_name: b2_service.bucket_name().to_string(),
        endpoint: b2_service.endpoint_url().to_string(),
    };

    (StatusCode::OK, Json(response)).into_response()
}
