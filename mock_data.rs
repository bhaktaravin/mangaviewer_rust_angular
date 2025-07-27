// Mock data for testing
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MockMangaData {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub attributes: MockMangaAttributes,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MockMangaAttributes {
    pub title: HashMap<String, String>,
    pub description: HashMap<String, String>,
    pub status: String,
    #[serde(rename = "originalLanguage")]
    pub original_language: Option<String>,
}

pub fn create_mock_manga_data() -> Vec<MockMangaData> {
    vec![
        MockMangaData {
            id: "1".to_string(),
            item_type: "manga".to_string(),
            attributes: MockMangaAttributes {
                title: {
                    let mut map = HashMap::new();
                    map.insert("en".to_string(), "Naruto".to_string());
                    map.insert("ja".to_string(), "ナルト".to_string());
                    map
                },
                description: {
                    let mut map = HashMap::new();
                    map.insert("en".to_string(), "A ninja story".to_string());
                    map
                },
                status: "completed".to_string(),
                original_language: Some("ja".to_string()),
            },
        },
        MockMangaData {
            id: "2".to_string(),
            item_type: "manga".to_string(),
            attributes: MockMangaAttributes {
                title: {
                    let mut map = HashMap::new();
                    map.insert("ko".to_string(), "Solo Leveling".to_string());
                    map
                },
                description: {
                    let mut map = HashMap::new();
                    map.insert("ko".to_string(), "Korean manhwa".to_string());
                    map
                },
                status: "ongoing".to_string(),
                original_language: Some("ko".to_string()),
            },
        },
        MockMangaData {
            id: "3".to_string(),
            item_type: "manga".to_string(),
            attributes: MockMangaAttributes {
                title: {
                    let mut map = HashMap::new();
                    map.insert("en".to_string(), "One Piece".to_string());
                    map.insert("ja".to_string(), "ワンピース".to_string());
                    map
                },
                description: {
                    let mut map = HashMap::new();
                    map.insert("en".to_string(), "Pirate adventure".to_string());
                    map
                },
                status: "ongoing".to_string(),
                original_language: Some("ja".to_string()),
            },
        },
    ]
}
