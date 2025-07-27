use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Deserialize;
use tokio::net::TcpListener;
use tracing_subscriber;

mod api;

use api::{FilteredMangaResponse, MangaData, MangaDexClient, MangaDexClientError};

#[derive(Deserialize)]
struct SearchParams {
    title: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
    include_non_english: Option<bool>,
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Build our application with routes
    let app = Router::new()
        .route("/", get(|| async { "MangaDex API Proxy - Use /api/manga endpoints" }))
        .route("/health", get(|| async { "OK" }))
        .route("/api/manga/:id", get(get_manga_handler))
        .route("/api/manga", get(search_manga_handler));

    // Get port from environment variable (Fly.io uses PORT) or default to 8080
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);

    println!("Server starting on {}", addr);

    // Run the server
    let listener = TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn get_manga_handler(Path(id): Path<String>) -> Result<Json<MangaData>, StatusCode> {
    let client = MangaDexClient::new();

    match client.get_manga(&id).await {
        Ok(manga) => Ok(Json(manga)),
        Err(MangaDexClientError::NotFound(_)) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn search_manga_handler(
    Query(params): Query<SearchParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let client = MangaDexClient::new();

    if let Some(title) = params.title {
        let include_non_english = params.include_non_english.unwrap_or(false);

        match client
            .search_manga_english_filtered(&title, params.limit, params.offset, include_non_english)
            .await
        {
            Ok(response) => Ok(Json(serde_json::to_value(response).unwrap())),
            Err(e) => Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Search failed",
                    "message": format!("{}", e)
                }))
            )),
        }
    } else {
        // Return helpful information instead of just an error
        Ok(Json(serde_json::json!({
            "message": "MangaDx API Search Endpoint",
            "usage": "Add ?title=<search_term> to search for manga",
            "examples": [
                "/api/manga?title=naruto",
                "/api/manga?title=one%20piece&limit=10",
                "/api/manga?title=attack%20on%20titan&include_non_english=true"
            ],
            "parameters": {
                "title": "Required - The manga title to search for",
                "limit": "Optional - Number of results (default: 10)",
                "offset": "Optional - Pagination offset (default: 0)",
                "include_non_english": "Optional - Include non-English manga (default: false)"
            }
        })))
    }
}
