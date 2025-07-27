// src/main.rs
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
u    tracing::info!("Starting MangaDx API Proxy server...");

    let mangadx_client = Arc::new(MangaDexClient::new());
    let manga_collection = db.collection::<MangaData>("manga");
    let app_state = AppState { 
        mangadx_client, 
        manga_collection 
    };erde::Deserialize;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;xum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    tracing::info!("Starting MangaDex API Proxy server...");

    let mangadex_client = Arc::new(MangaDexClient::new());
    let manga_collection = db.collection::<MangaData>("manga");
    let app_state = AppState { 
        mangadex_client, 
        manga_collection 
    };Router,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
use api::{
    MangaData, MangaDexApiErrorDetail, MangaDexApiErrorResponse, MangaDexClient,
    MangaDexClientError, MangaDexResponse,
};
use mongodb::Collection;

mod config;
use config::connect_to_mongodb;
use dotenv::dotenv;

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
    manga_collection: Collection<MangaData>
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
) -> Result<Json<MangaDexResponse>, AppError> {
    tracing::info!("Received search request for title: {}", params.title);

    let results = state
        .mangadex_client
        .search_manga(&params.title, params.limit, params.offset)
        .await?;

    // Optional: Save each manga to MongoDB
    for manga in &results.data {
        let _ = state
            .manga_collection
            .insert_one(manga, None)
            .await;
    }

    Ok(Json(results))
}


// --- Main Application ---

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok(); // Load environment variables from .env file
    let db = connect_to_mongodb().await.expect("Failed to connect to MongoDB");

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
        .route("/api/manga", get(root_handler))
        .route("/api/manga/search", get(search_manga_handler))
        .route("/api/manga/:id", get(get_manga_by_id_handler))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::info!("Listening on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;

    Ok(())
}