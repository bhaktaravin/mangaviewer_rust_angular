use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use urlencoding;

// --- API Response Structs ---

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MangaDexResponse {
    pub data: Vec<MangaData>,
    pub limit: u32,
    pub offset: u32,
    pub total: u32,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct FilteredMangaResponse {
    pub english_manga: Vec<MangaData>,
    pub non_english_manga: Vec<MangaData>,
    pub english_count: u32,
    pub non_english_count: u32,
    pub total: u32,
    pub has_english_content: bool,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MangaData {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub attributes: MangaAttributes,
}

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
}

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
#[derive(thiserror::Error, Debug)]
pub enum MangaDexClientError {
    #[error("MangaDex API returned an error: {:?}", _0)]
    ApiError(Vec<MangaDexApiErrorDetail>),
    #[error("Manga not found: {0}")]
    NotFound(String),
    #[error("Request to MangaDex API failed: {0}")]
    Reqwest(#[from] reqwest::Error),
    #[error("Unexpected response from MangaDx API: {0}")]
    RequestFailed(String),
}

// --- MangaDexClient ---
pub struct MangaDexClient {
    client: Client,
    base_url: String,
}

impl MangaDexClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .user_agent("MangaDexAxumProxy/1.0 (https://github.com/bhaktaravin/mangaviewer_rust_angular)")
            .build()
            .expect("Failed to build reqwest client");

        MangaDexClient {
            client,
            base_url: "https://api.mangadex.org".to_string(), // Fixed: was "mangadx"
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
        let mut url = format!("{}/manga?title={}", self.base_url, urlencoding::encode(title));

        if let Some(l) = limit {
            url.push_str(&format!("&limit={}", l));
        }
        if let Some(o) = offset {
            url.push_str(&format!("&offset={}", o));
        }

        tracing::info!("Searching manga from: {}", url);

        let response = self.client.get(&url).send().await?;
        let status = response.status();
        let body_text = response.text().await.map_err(MangaDexClientError::Reqwest)?;

        if !status.is_success() {
            if let Ok(api_error_response) = serde_json::from_str::<MangaDexApiErrorResponse>(&body_text) {
                return Err(MangaDexClientError::ApiError(api_error_response.errors));
            } else {
                return Err(MangaDexClientError::RequestFailed(format!(
                    "Non-success status: {} - Body: {}",
                    status, body_text
                )));
            }
        }

        serde_json::from_str(&body_text)
            .map_err(|e| MangaDexClientError::RequestFailed(format!("Failed to parse success JSON: {}", e)))
    }

    pub async fn search_manga_english_filtered(
        &self,
        title: &str,
        limit: Option<u32>,
        offset: Option<u32>,
        include_non_english: bool,
    ) -> Result<FilteredMangaResponse, MangaDexClientError> {
        // First get all results
        let response = self.search_manga(title, limit, offset).await?;
        
        // Filter manga based on English content availability
        let (english_manga, non_english_manga) = Self::filter_manga_by_language(&response.data);
        
        let english_count = english_manga.len() as u32;
        let non_english_count = non_english_manga.len() as u32;
        let has_english_content = english_count > 0;
        
        // Generate appropriate message
        let message = if !has_english_content && non_english_count > 0 {
            Some(format!(
                "No English manga found for '{}'. Found {} manga in other languages. Would you like to see them?", 
                title, non_english_count
            ))
        } else if has_english_content && non_english_count > 0 && !include_non_english {
            Some(format!(
                "Showing {} English manga. {} additional manga available in other languages.", 
                english_count, non_english_count
            ))
        } else {
            None
        };

        Ok(FilteredMangaResponse {
            english_manga: english_manga.clone(),
            non_english_manga: if include_non_english { non_english_manga } else { Vec::new() },
            english_count,
            non_english_count,
            total: response.total,
            has_english_content,
            message,
        })
    }

    fn filter_manga_by_language(manga_list: &[MangaData]) -> (Vec<MangaData>, Vec<MangaData>) {
        let mut english_manga = Vec::new();
        let mut non_english_manga = Vec::new();

        for manga in manga_list {
            if Self::has_english_content(manga) {
                english_manga.push(manga.clone());
            } else {
                non_english_manga.push(manga.clone());
            }
        }

        (english_manga, non_english_manga)
    }

    fn has_english_content(manga: &MangaData) -> bool {
        // Check if manga has English title
        if manga.attributes.title.contains_key("en") {
            return true;
        }
        
        // Check if manga has English description
        if manga.attributes.description.contains_key("en") {
            return true;
        }
        
        // Check if original language is English
        if let Some(ref lang) = manga.attributes.original_language {
            if lang == "en" {
                return true;
            }
        }
        
        false
    }
}

pub async fn root_handler() -> Result<String, MangaDexClientError> {
    println!("Welcome to the MangaDx API Proxy!");
    println!("Try /api/manga/ or /api/manga?title=...");

    let client = Client::builder()
        .user_agent("MangaDxAxumProxy/1.0")
        .build()
        .expect("Failed to build client");

    let url = "https://api.mangadex.org/manga";

    let res = client.get(url).send().await.map_err(MangaDexClientError::Reqwest)?;
    let status = res.status();
    if status.is_success() {
        let body = res.text().await.map_err(MangaDexClientError::Reqwest)?;
        tracing::info!("Response from MangaDx: {}", body);
        Ok(body)
    } else {
        Err(MangaDexClientError::RequestFailed(format!(
            "Failed to fetch root handler: {}",
            status
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn create_test_manga(title_en: Option<&str>, desc_en: Option<&str>, orig_lang: Option<&str>) -> MangaData {
        let mut title = HashMap::new();
        let mut description = HashMap::new();
        
        if let Some(en_title) = title_en {
            title.insert("en".to_string(), en_title.to_string());
        }
        title.insert("ja".to_string(), "日本語タイトル".to_string());
        
        if let Some(en_desc) = desc_en {
            description.insert("en".to_string(), en_desc.to_string());
        }
        description.insert("ja".to_string(), "日本語説明".to_string());

        MangaData {
            id: "test".to_string(),
            item_type: "manga".to_string(),
            attributes: MangaAttributes {
                title,
                description,
                status: "ongoing".to_string(),
                last_volume: None,
                last_chapter: None,
                original_language: orig_lang.map(|s| s.to_string()),
                year: Some(2023),
                content_rating: Some("safe".to_string()),
                created_at: "2023-01-01T00:00:00Z".to_string(),
                updated_at: "2023-01-01T00:00:00Z".to_string(),
                version: 1,
                latest_uploaded_chapter: None,
            },
        }
    }

        assert!(MangaDexClient::has_english_content(&manga));
    }

    #[test]
    fn test_no_english_content() {
        let manga = create_test_manga(None, None, Some("ja"));
        assert!(!MangaDexClient::has_english_content(&manga));
    }

    #[test]
    fn test_filter_manga_by_language() {
        let manga_list = vec![
            create_test_manga(Some("Naruto"), None, None),          // English
            create_test_manga(None, None, Some("ko")),              // Korean
            create_test_manga(None, Some("English desc"), None),    // English
        ];

        let (english, non_english) = MangaDexClient::filter_manga_by_language(&manga_list);
        
        assert_eq!(english.len(), 2);
        assert_eq!(non_english.len(), 1);
    }
}
