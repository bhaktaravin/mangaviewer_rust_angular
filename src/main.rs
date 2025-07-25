// src/main.rs

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::Deserialize;
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