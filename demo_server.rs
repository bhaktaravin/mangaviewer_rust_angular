// Working demo server for English filtering
use axum::{
    extract::Query,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
struct SearchParams {
    title: Option<String>,
    limit: Option<u32>,
    include_non_english: Option<bool>,
}

#[derive(Debug, Serialize, Clone)]
struct DemoManga {
    id: String,
    title: HashMap<String, String>,
    description: HashMap<String, String>,
    original_language: Option<String>,
}

#[derive(Debug, Serialize)]
struct FilteredResponse {
    english_manga: Vec<DemoManga>,
    non_english_manga: Vec<DemoManga>,
    english_count: u32,
    non_english_count: u32,
    total: u32,
    has_english_content: bool,
    message: Option<String>,
}

fn create_demo_data() -> Vec<DemoManga> {
    vec![
        DemoManga {
            id: "1".to_string(),
            title: {
                let mut map = HashMap::new();
                map.insert("en".to_string(), "Naruto".to_string());
                map.insert("ja".to_string(), "ナルト".to_string());
                map
            },
            description: {
                let mut map = HashMap::new();
                map.insert("en".to_string(), "A ninja story about Naruto Uzumaki".to_string());
                map
            },
            original_language: Some("ja".to_string()),
        },
        DemoManga {
            id: "2".to_string(),
            title: {
                let mut map = HashMap::new();
                map.insert("ko".to_string(), "나 혼자만 레벨업".to_string());
                map
            },
            description: {
                let mut map = HashMap::new();
                map.insert("ko".to_string(), "Korean manhwa".to_string());
                map
            },
            original_language: Some("ko".to_string()),
        },
        DemoManga {
            id: "3".to_string(),
            title: {
                let mut map = HashMap::new();
                map.insert("en".to_string(), "One Piece".to_string());
                map.insert("ja".to_string(), "ワンピース".to_string());
                map
            },
            description: {
                let mut map = HashMap::new();
                map.insert("en".to_string(), "Pirate adventure manga".to_string());
                map
            },
            original_language: Some("ja".to_string()),
        },
    ]
}

fn has_english_content(manga: &DemoManga) -> bool {
    manga.title.contains_key("en") || 
    manga.description.contains_key("en") || 
    manga.original_language.as_ref() == Some(&"en".to_string())
}

fn filter_manga_by_language(manga_list: &[DemoManga]) -> (Vec<DemoManga>, Vec<DemoManga>) {
    let mut english_manga = Vec::new();
    let mut non_english_manga = Vec::new();

    for manga in manga_list {
        if has_english_content(manga) {
            english_manga.push(manga.clone());
        } else {
            non_english_manga.push(manga.clone());
        }
    }

    (english_manga, non_english_manga)
}

async fn search_english_handler(Query(params): Query<SearchParams>) -> Json<FilteredResponse> {
    let title = params.title.unwrap_or_else(|| "".to_string());
    let include_non_english = params.include_non_english.unwrap_or(false);
    
    // Get all demo data (normally this would be from your API)
    let all_manga = create_demo_data();
    
    // Filter by title if provided
    let filtered_manga: Vec<DemoManga> = if title.is_empty() {
        all_manga
    } else {
        all_manga.into_iter().filter(|manga| {
            manga.title.values().any(|t| t.to_lowercase().contains(&title.to_lowercase()))
        }).collect()
    };
    
    // Filter by language
    let (english_manga, non_english_manga) = filter_manga_by_language(&filtered_manga);
    
    let english_count = english_manga.len() as u32;
    let non_english_count = non_english_manga.len() as u32;
    let has_english_content = english_count > 0;
    
    // Generate message
    let message = if !has_english_content && non_english_count > 0 {
        Some(format!(
            "No English manga found for '{}'. Found {} manga in other languages. Set include_non_english=true to see them.", 
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

    Json(FilteredResponse {
        english_manga,
        non_english_manga: if include_non_english { non_english_manga } else { Vec::new() },
        english_count,
        non_english_count,
        total: english_count + non_english_count,
        has_english_content,
        message,
    })
}

async fn hello() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "English Filtering Demo API",
        "endpoints": [
            "GET / - This message",
            "GET /api/manga/search-english?title=naruto - Search with English filtering",
            "GET /api/manga/search-english?title=naruto&include_non_english=true - Include non-English results"
        ]
    }))
}

#[tokio::main]
async fn main() {
    println!("🚀 Starting English Filtering Demo Server...");
    
    let app = Router::new()
        .route("/", get(hello))
        .route("/api/manga/search-english", get(search_english_handler));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3002").await.unwrap();
    println!("📡 Demo server running on http://localhost:3002");
    println!("🧪 Test endpoints:");
    println!("   curl http://localhost:3002/");
    println!("   curl 'http://localhost:3002/api/manga/search-english?title=naruto'");
    println!("   curl 'http://localhost:3002/api/manga/search-english?title=solo&include_non_english=true'");
    
    axum::serve(listener, app).await.unwrap();
}
