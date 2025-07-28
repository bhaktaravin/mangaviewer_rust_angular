use axum::{
    extract::{Query, State},
    http::StatusCode,
     }

    let mangadex_client = Arc::new(MangaDexClient::new());
    let manga_collection = db.collection::<MangaData>("manga");
    
    // Initialize AI service (optional - will work without it)
    let ai_service = match AIService::new() {
        Ok(service) => {
            tracing::info!("AI service initialized successfully");
            Some(Arc::new(service))
        }
        Err(e) => {
            tracing::warn!("AI service initialization failed: {}. AI features will be disabled.", e);
            None
        }
    };

    let app_state = AppState {
        mangadex_client,
        manga_collection,
        ai_service,
    };

    let app = Router::new()
        .route("/", get(|| async { "Manga API Server is running!" }))
        .route("/api/manga/search", get(search_manga_handler))
        .route("/api/manga/search-english", get(search_manga_english_handler))
        .route("/api/manga/smart-search", post(smart_search_handler))
        .route("/api/manga/smart-search-english", post(smart_search_english_handler))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::info!("Server running on http://0.0.0.0:3000");
    
    axum::serve(listener, app).await?;

    Ok(())
}sponse::Json,
    routing::{get, post},
    Router,
};
use mongodb::{bson, Client, Collection, options::ClientOptions};
use serde::Deserialize;
use std::sync::Arc;
use std::time::Duration;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
use api::{
    MangaDexClient, MangaData, FilteredMangaResponse, MangaDexResponse,
    MangaDexClientError
};

mod ai_service;
use ai_service::AIService;

#[derive(Debug, Deserialize)]
struct SmartSearchRequest {
    query: String,
    preferences: Option<serde_json::Value>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // MongoDB connection with timeout handling
    let mongodb_uri = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
    
    let client_options = ClientOptions::parse(&mongodb_uri).await?;
    let client = Client::with_options(client_options)?;
    
    // Test connection with timeout
    let db = client.database("mangaviewer");
    
    // Wrap database operations with timeout
    let ping_result = tokio::time::timeout(
        Duration::from_secs(10),
        client.database("admin").run_command(bson::doc! {"ping": 1}, None)
    ).await;
    
    match ping_result {
        Ok(Ok(_)) => tracing::info!("Connected to MongoDB successfully"),
        Ok(Err(e)) => {
            tracing::error!("MongoDB connection failed: {}", e);
            return Err(Box::new(e));
        }
        Err(_) => {
            tracing::error!("MongoDB connection timeout");
            return Err("MongoDB connection timeout".into());
        }
    }n.rs
use axum::{
    extract::{Path, Query, State},
    h    let mangadex_client = Arc::new(MangaDexClient::new());
    let manga_collection = db.collection::<MangaData>("manga");
    
    // Initialize AI service (optional - will work without it)
    let ai_service = match AIService::new() {
        Ok(service) => {
            tracing::info!("AI service initialized successfully");
            Some(Arc::new(service))
        }
        Err(e) => {
            tracing::warn!("AI service initialization failed: {}. AI features will be disabled.", e);
            None
        }
    };e,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use mongodb::{bson, Client, Collection, options::ClientOptions};
use serde::Deserialize;
use std::sync::Arc;
use std::time::Duration;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
use api::{
    MangaDexClient, MangaData, FilteredMangaResponse, MangaDexResponse,
    MangaDexClientError
};
mod ai_service;
use ai_service::AIService;

// Import error handling types  
#[derive(Debug, Deserialize)]
struct SmartSearchRequest {
    query: String,
    preferences: Option<serde_json::Value>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // MongoDB connection with timeout handling
    let mongodb_uri = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
    
    let client_options = ClientOptions::parse(&mongodb_uri).await?;
    let client = Client::with_options(client_options)?;
    
    // Test connection with timeout
    let db = client.database("mangaviewer");
    
    // Wrap database operations with timeout
    let ping_result = tokio::time::timeout(
        Duration::from_secs(10),
        client.database("admin").run_command(bson::doc! {"ping": 1}, None)
    ).await;
    
    match ping_result {
        Ok(Ok(_)) => tracing::info!("Connected to MongoDB successfully"),
        Ok(Err(e)) => {
            tracing::error!("MongoDB connection failed: {}", e);
            return Err(Box::new(e));
        }
        Err(_) => {
            tracing::error!("MongoDB connection timeout");
            return Err("MongoDB connection timeout".into());
        }
    }

    let mangadex_client = Arc::new(MangaDexClient::new());
    let manga_collection = db.collection::<MangaData>("manga");
    
    // Initialize AI service (optional - will work without it)
    let ai_service = match AIService::new() {
        Ok(service) => {
            tracing::info!("AI service initialized successfully");
            Some(Arc::new(service))
        }
        Err(e) => {
            tracing::warn!("AI service initialization failed: {}. AI features will be disabled.", e);
            None
        }
    };

    let app_state = AppState {
        mangadex_client,
        manga_collection,
        ai_service,
    };

    let app = Router::new()
        .route("/", get(|| async { "Manga API Server is running!" }))
        .route("/api/manga/search", get(search_manga_handler))
        .route("/api/manga/search-english", get(search_manga_english_handler))
        .route("/api/manga/smart-search", post(smart_search_handler))
        .route("/api/manga/smart-search-english", post(smart_search_english_handler))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::info!("Server running on http://0.0.0.0:3000");
    
    axum::serve(listener, app).await?;

    Ok(())
}

// --- Custom Error Handling for Axum ---
#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("MangaDex client error: {0}")]
    MangaDexClient(#[from] MangaDexClientError),
    #[error("Internal server error: {0}")]
    Internal(#[from] anyhow::Error),
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
            AppError::MangaDexClient(MangaDexClientError::RequestFailed(msg)) => (
                StatusCode::BAD_GATEWAY,
                format!("MangaDex API response error: {}", msg),
            ),
            AppError::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "An unexpected error occurred.".to_string(),
            ),
        };

        (status, Json(serde_json::json!({ "error": error_message }))).into_response()
    }
}

// --- Axum Handlers ---
#[derive(Clone)]
struct AppState {
    mangadex_client: Arc<MangaDexClient>,
    manga_collection: Collection<MangaData>,
    ai_service: Option<Arc<AIService>>,
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
    "Welcome to the MangaDx API Proxy! Try /api/manga/{id} or /api/manga?title=..."
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
        let _ = state.manga_collection.insert_one(manga).await;
    }

    Ok(Json(results))
}

// --- English-Filtered Handlers ---

#[derive(Debug, Deserialize)]
pub struct EnglishSearchParams {
    pub title: String,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub include_non_english: Option<bool>,
}

async fn search_manga_english_handler(
    State(state): State<AppState>,
    Query(params): Query<EnglishSearchParams>,
) -> Result<Json<FilteredMangaResponse>, AppError> {
    tracing::info!("Received English-filtered search request for title: {}", params.title);

    let include_non_english = params.include_non_english.unwrap_or(false);
    
    let results = state
        .mangadex_client
        .search_manga_english_filtered(&params.title, params.limit, params.offset, include_non_english)
        .await?;

    // Save English manga to MongoDB
    for manga in &results.english_manga {
        let _ = state.manga_collection.insert_one(manga).await;
    }

    // Save non-English manga if included
    if include_non_english {
        for manga in &results.non_english_manga {
            let _ = state.manga_collection.insert_one(manga).await;
        }
    }

    Ok(Json(results))
}

// --- AI-Powered Handlers ---

#[derive(Debug, Deserialize)]
pub struct SmartSearchParams {
    pub query: String,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

async fn smart_search_handler(
    State(state): State<AppState>,
    Query(params): Query<SmartSearchParams>,
) -> Result<Json<MangaDexResponse>, AppError> {
    tracing::info!("Received smart search request for: {}", params.query);

    let search_query = if let Some(ai_service) = &state.ai_service {
        // Use AI to convert natural language to search keywords
        match ai_service.semantic_search_query(&params.query).await {
            Ok(optimized_query) => {
                tracing::info!("AI optimized search query: {}", optimized_query);
                optimized_query
            }
            Err(e) => {
                tracing::warn!("AI search optimization failed: {}, using original query", e);
                params.query.clone()
            }
        }
    } else {
        params.query.clone()
    };

    let results = state
        .mangadex_client
        .search_manga(&search_query, params.limit, params.offset)
        .await?;

    // Save results to MongoDB
    for manga in &results.data {
        let _ = state.manga_collection.insert_one(manga).await;
    }

    Ok(Json(results))
}

async fn smart_search_english_handler(
    State(state): State<AppState>,
    Query(params): Query<EnglishSearchParams>,
) -> Result<Json<FilteredMangaResponse>, AppError> {
    tracing::info!("Received English-filtered smart search request for: {}", params.title);

    let search_query = if let Some(ai_service) = &state.ai_service {
        // Use AI to convert natural language to search keywords
        match ai_service.semantic_search_query(&params.title).await {
            Ok(optimized_query) => {
                tracing::info!("AI optimized search query: {}", optimized_query);
                optimized_query
            }
            Err(e) => {
                tracing::warn!("AI search optimization failed: {}, using original query", e);
                params.title.clone()
            }
        }
    } else {
        params.title.clone()
    };

    let include_non_english = params.include_non_english.unwrap_or(false);
    
    let results = state
        .mangadex_client
        .search_manga_english_filtered(&search_query, params.limit, params.offset, include_non_english)
        .await?;

    // Save English manga to MongoDB
    for manga in &results.english_manga {
        let _ = state.manga_collection.insert_one(manga).await;
    }

    // Save non-English manga if included
    if include_non_english {
        for manga in &results.non_english_manga {
            let _ = state.manga_collection.insert_one(manga).await;
        }
    }

    Ok(Json(results))
}

#[derive(Debug, Deserialize)]
pub struct RecommendationParams {
    pub preferences: String,
    pub liked_manga_ids: Option<Vec<String>>,
}

async fn get_recommendations_handler(
    State(state): State<AppState>,
    Query(params): Query<RecommendationParams>,
) -> Result<Json<serde_json::Value>, AppError> {
    tracing::info!("Received recommendation request for preferences: {}", params.preferences);

    let ai_service = state.ai_service.as_ref()
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("AI service not available")))?;

    // Get liked manga data if IDs provided
    let mut liked_manga = Vec::new();
    if let Some(ids) = params.liked_manga_ids {
        for id in ids {
            if let Ok(manga) = state.mangadex_client.get_manga(&id).await {
                liked_manga.push(manga);
            }
        }
    }

    let recommendation = ai_service
        .get_manga_recommendations(&params.preferences, &liked_manga)
        .await?;

    // Use the AI-generated search query to find actual manga
    let search_results = state
        .mangadex_client
        .search_manga(&recommendation.search_query, Some(10), None)
        .await?;

    let response = serde_json::json!({
        "recommendation": recommendation,
        "suggested_manga": search_results.data,
        "total_found": search_results.total
    });

    Ok(Json(response))
}

async fn get_manga_summary_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<MangaSummary>, AppError> {
    tracing::info!("Received AI summary request for manga ID: {}", id);

    let ai_service = state.ai_service.as_ref()
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("AI service not available")))?;

    let manga = state.mangadex_client.get_manga(&id).await?;
    let summary = ai_service.generate_manga_summary(&manga).await?;

    Ok(Json(summary))
}

// --- Main Application ---
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    
    // Initialize logging first
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "mangadx_api_proxy=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting MangaDex API Proxy server...");

    // Try MongoDB connection with timeout
    let db = match tokio::time::timeout(
        std::time::Duration::from_secs(10),
        connect_to_mongodb()
    ).await {
        Ok(Ok(db)) => {
            tracing::info!("Successfully connected to MongoDB");
            db
        }
        Ok(Err(e)) => {
            tracing::error!("Failed to connect to MongoDB: {}", e);
            return Err(anyhow::anyhow!("MongoDB connection failed: {}", e));
        }
        Err(_) => {
            tracing::error!("MongoDB connection timed out after 10 seconds");
            return Err(anyhow::anyhow!("MongoDB connection timeout"));
        }
    };

    let mangadex_client = Arc::new(MangaDexClient::new());
    let manga_collection = db.collection::<MangaData>("manga");
    let app_state = AppState {
        mangadex_client,
        manga_collection,
    };

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/api/manga", get(root_handler))
        .route("/api/manga/search", get(search_manga_handler))
        .route("/api/manga/search-english", get(search_manga_english_handler))
        .route("/api/manga/smart-search", get(smart_search_handler))
        .route("/api/manga/smart-search-english", get(smart_search_english_handler))
        .route("/api/manga/recommendations", get(get_recommendations_handler))
        .route("/api/manga/:id", get(get_manga_by_id_handler))
        .route("/api/manga/:id/summary", get(get_manga_summary_handler))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::info!("Listening on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;

    Ok(())
}
