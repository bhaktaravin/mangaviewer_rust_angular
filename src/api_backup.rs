// src/api.rs

use reqwest::{Client, Error};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use urlencoding;

// --- API Response Structs ---reqwest::{Client, Error};
use serde::{Deserialize, Serialize};
use stimpl MangaDexClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .user_agent("MangaDexAxumProxy/1.0 (https://github.com/bhaktaravin/mangaviewer_rust_angular)")
            .build()
            .expect("Failed to build reqwest client");

        MangaDexClient {
            client,
            base_url: "https://api.mangadex.org".to_string(),
        }
    }::HashMap;
use urlencoding;

// --- API Response Structs ---

// THIS IS THE DEFINITION OF MangaDexResponse
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MangaDexResponse {
    pub data: Vec<MangaData>,
    pub limit: u32,
    pub offset: u32,
    pub total: u32,
}

// THIS IS THE DEFINITION OF MangaData
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MangaData {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub attributes: MangaAttributes,
    // pub relationships: Vec<serde_json::Value>, // Using Value for simplicity if not detailing further
}

// THIS IS THE DEFINITION OF MangaAttributes
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MangaAttributes {
    pub title: HashMap<String, String>,
    pub description: HashMap<String, String>,
    pub status: String,
    #[serde(rename = "lastVolume")]
    pub last_volume: Option<String>,
    #[serde(rename = "lastChapter")]
    pub last_chapter: Option<String>,
    #[serde(rename = "originalLanguage")]
    pub original_language: Option<String>,
    pub year: Option<u16>,
    #[serde(rename = "contentRating")]
    pub content_rating: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub version: u32,
    #[serde(rename = "latestUploadedChapter")]
    pub latest_uploaded_chapter: Option<String>,
    // Add other fields you might need, like tags, links, etc.
}

// THESE ARE THE DEFINITIONS FOR MangaDexApiErrorResponse AND MangaDexApiErrorDetail
#[derive(Debug, Deserialize, Serialize)]
pub struct MangaDexApiErrorResponse {
    pub errors: Vec<MangaDexApiErrorDetail>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MangaDexApiErrorDetail {
    pub id: String,
    pub status: u16,
    pub title: String,
    pub detail: String,
}

// --- Custom Error for MangaDexClient ---
// THIS IS THE DEFINITION FOR MangaDexClientError
#[derive(thiserror::Error, Debug)]
pub enum MangaDexClientError {
    #[error("MangaDex API returned an error: {:?}", _0)]
    ApiError(Vec<MangaDexApiErrorDetail>),
    #[error("Manga not found: {0}")]
    NotFound(String),
    #[error("Request to MangaDex API failed: {0}")]
    Reqwest(#[from] reqwest::Error),
    #[error("Unexpected response from MangaDex API: {0}")]
    RequestFailed(String),
}

// --- MangaDexClient ---
// THIS IS THE DEFINITION FOR MangaDexClient struct and its impl block
pub struct MangaDexClient {
    client: Client,
    base_url: String,
}

impl MangaDexClient {
    pub fn new() -> Self {
            let client = Client::builder()
                .user_agent("MangaDexAxumProxy/1.0 (https://github.com/bhaktaravin/mangaviewer_rust_angular") // <-- Add this line
            // Or, for a more generic one, though custom is better:
            // .user_agent(concat!(env!("CARGO_PKG_NAME"), "/", env!("CARGO_PKG_VERSION"))) // Reads from Cargo.toml
                .build()
                .expect("Failed to build reqwest client"); // build() can fail, so handle it

        MangaDexClient {
            client,
            base_url: "https://api.mangadex.org/manga".to_string(),
        }
    }

    pub async fn get_manga(&self, id: &str) -> Result<MangaData, MangaDexClientError> {
        let url = format!("{}/manga/{}", self.base_url, id);
        tracing::info!("Fetching manga from: {}", url);

        let response = self.client.get(&url).send().await?;
        let status = response.status();
        let body_text = response.text().await.map_err(MangaDexClientError::Reqwest)?;

        if !status.is_success() {
            if status == reqwest::StatusCode::NOT_FOUND {
                return Err(MangaDexClientError::NotFound(format!(
                    "Manga with ID '{}' not found.",
                    id
                )));
            }
            if let Ok(api_error_response) = serde_json::from_str::<MangaDexApiErrorResponse>(&body_text) {
                return Err(MangaDexClientError::ApiError(api_error_response.errors));
            } else {
                return Err(MangaDexClientError::RequestFailed(format!(
                    "Non-success status: {} - Body: {}",
                    status, body_text
                )));
            }
        }

        let mangadex_response: MangaDexResponse = serde_json::from_str(&body_text)
            .map_err(|e| MangaDexClientError::RequestFailed(format!("Failed to parse success JSON: {}", e)))?;

        mangadex_response
            .data
            .into_iter()
            .next()
            .ok_or_else(|| MangaDexClientError::NotFound(format!("No data found for ID '{}'", id)))
    }

    pub async fn search_manga(
        &self,
        title: &str,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<MangaDexResponse, MangaDexClientError> {
        let encoded_title = urlencoding::encode(title);
        let mut url = format!("{}/manga?title={}", self.base_url, encoded_title);

        if let Some(limit) = limit {
            url.push_str(&format!("&limit={}", limit));
        }
        if let Some(offset) = offset {
            url.push_str(&format!("&offset={}", offset));
        }

        tracing::info!("Searching manga with URL: {}", url);

        let res = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(MangaDexClientError::from)?;

        if res.status().is_success() {
            let body = res.json::<MangaDexResponse>().await?;
            Ok(body)
        } else {
            let err = res.json::<MangaDexApiErrorResponse>().await?;
            Err(MangaDexClientError::ApiError(err.errors))
        }
    }
}

pub async fn root_handler() -> Result<String, MangaDexClientError> {
    println!("Welcome to the MangaDex API Proxy!");
    println!("Try /api/manga/ or /api/manga?title=...");

    let client = Client::builder()
        .user_agent("MangaDexAxumProxy/1.0")
        .build()
        .expect("Failed to build client");

    let url = "https://api.mangadex.org/manga";

    let res = client.get(url).send().await.map_err(MangaDexClientError::Reqwest)?;
    let status = res.status();
    if status.is_success() {
        let body = res.text().await.map_err(MangaDexClientError::Reqwest)?;
        tracing::info!("Response from MangaDex: {}", body);
        Ok(body)
    } else {
        Err(MangaDexClientError::RequestFailed(format!(
            "Failed to fetch root handler: {}",
            status
        )))
    }
}

}