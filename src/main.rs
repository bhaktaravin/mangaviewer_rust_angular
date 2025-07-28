<<<<<<< HEAD
use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::Json,
=======
// src/main.rs

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
>>>>>>> 503d67f74a48590acb0faed7784918fdab662117
    routing::get,
    Router,
};
use serde::Deserialize;
<<<<<<< HEAD
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
=======
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
use api::{
    MangaData, MangaDexApiErrorDetail, MangaDexApiErrorResponse, MangaDexClient,
    MangaDexClientError, MangaDexResponse, // Ensure MangaDexResponse is imported
};

// --- Custom Error Handling for Axum ---
#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("MangaDex client error: {0}")]
    MangaDexClient(#[from] MangaDexClientError),
    #[error("Internal server error: {0}")]
    Internal(#[from] anyhow::Error), // Catch-all for other errors
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        tracing::error!("Application Error: {:?}", self);

        let (status, error_message) = match self {
            AppError::MangaDexClient(MangaDexClientError::NotFound(msg)) => {
                (StatusCode::NOT_FOUND, msg)
            }
            AppError::MangaDexClient(MangaDexClientError::ApiError(errors)) => {
                let msg = errors
                    .into_iter()
                    .map(|e| format!("{}: {}", e.title, e.detail))
                    .collect::<Vec<_>>()
                    .join(", ");
                (
                    StatusCode::BAD_GATEWAY,
                    format!("MangaDex API error: {}", msg),
                )
            }
            AppError::MangaDexClient(MangaDexClientError::Reqwest(e)) => (
                StatusCode::BAD_GATEWAY,
                format!("Network error connecting to MangaDex: {}", e),
            ),
            AppError::MangaDexClient(MangaDexClientError::RequestFailed(msg)) => ( // THIS IS NOW CORRECT
                StatusCode::BAD_GATEWAY,
                format!("MangaDex API response error: {}", msg),
            ),
            AppError::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "An unexpected error occurred.".to_string(),
            ),
        };

        // Return a JSON error response
        (status, Json(serde_json::json!({ "error": error_message }))).into_response()
    }
}

// --- Axum Handlers ---

#[derive(Clone)]
struct AppState {
    mangadex_client: Arc<MangaDexClient>,
}

async fn get_manga_by_id_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<MangaData>, AppError> {
    tracing::info!("Received request for manga ID: {}", id);
    let manga = state.mangadex_client.get_manga(&id).await?;
    Ok(Json(manga))
}

async fn root_handler() -> &'static str {
    "Welcome to the MangaDex API Proxy! Try /api/manga/{id} or /api/manga?title=..."
}

#[derive(Debug, Deserialize)]
pub struct SearchQueryParams {
    pub title: String,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

async fn search_manga_handler(
    State(state): State<AppState>,
    Query(params): Query<SearchQueryParams>,
) -> Result<Json<MangaDexResponse>, AppError> { // MangaDexResponse is now a struct, no generics needed
    tracing::info!("Received search request for title: {}", params.title);

    let results = state
        .mangadex_client // This is Arc<MangaDexClient>
        .as_ref()        // Explicitly get a &MangaDexClient reference
        .search_manga(&params.title, params.limit, params.offset) // search_manga is now found
        .await?;

    Ok(Json(results))
}

// --- Main Application ---

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "mangadex_api_proxy=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting MangaDex API Proxy server...");

    let mangadex_client = Arc::new(MangaDexClient::new());
    let app_state = AppState { mangadex_client };

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/api/manga", get(search_manga_handler))
        .route("/api/manga/:id", get(get_manga_by_id_handler))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::info!("Listening on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;

    Ok(())
}
>>>>>>> 503d67f74a48590acb0faed7784918fdab662117
