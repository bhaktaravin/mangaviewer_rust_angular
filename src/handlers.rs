use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::progress::{ReadingStatus, ProgressService};
use crate::search::{AdvancedSearchParams, SearchService};
use crate::manga_service::MangaService;
use crate::cache::CacheService;

// AppState type for handlers
#[derive(Clone)]
pub struct AppState {
    pub manga_service: MangaService,
    pub progress_service: ProgressService,
    pub search_service: SearchService,
    pub cache_service: Option<CacheService>,
}

// ====== Progress Tracking Handlers ======

#[derive(Deserialize)]
pub struct AddToLibraryRequest {
    pub user_id: String,
    pub manga_id: String,
    pub status: ReadingStatus,
    pub title: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateProgressRequest {
    pub user_id: String,
    pub manga_id: String,
    pub chapter_id: String,
    pub current_page: i32,
    pub total_pages: i32,
}

#[derive(Deserialize)]
pub struct GetLibraryQuery {
    pub user_id: String,
    pub status: Option<ReadingStatus>,
}

#[derive(Deserialize)]
pub struct GetStatsQuery {
    pub user_id: String,
}

/// Add manga to user's library
pub async fn add_to_library_handler(
    State(state): State<AppState>,
    Json(req): Json<AddToLibraryRequest>,
) -> impl IntoResponse {
    match state.progress_service
        .add_to_library(
            &req.user_id,
            &req.manga_id,
            &req.title.as_deref().unwrap_or("Unknown"),
            req.status,
        )
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Added to library"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "error": e.to_string()
            })),
        ),
    }
}

/// Update reading progress
pub async fn update_progress_handler(
    State(state): State<AppState>,
    Json(req): Json<UpdateProgressRequest>,
) -> impl IntoResponse {
    match state.progress_service
        .update_progress(
            &req.user_id,
            &req.manga_id,
            &req.chapter_id,
            req.current_page as u32,
            req.total_pages as u32,
        )
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Progress updated"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "error": e.to_string()
            })),
        ),
    }
}

/// Get user's library
pub async fn get_library_handler(
    State(state): State<AppState>,
    Query(query): Query<GetLibraryQuery>,
) -> impl IntoResponse {
    match state.progress_service
        .get_library(&query.user_id, query.status, 0, 100)
        .await
    {
        Ok(library) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "library": library
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "error": e.to_string()
            })),
        ),
    }
}

/// Get user's reading statistics
pub async fn get_reading_stats_handler(
    State(state): State<AppState>,
    Query(query): Query<GetStatsQuery>,
) -> impl IntoResponse {
    match state.progress_service.get_reading_stats(&query.user_id).await {
        Ok(stats) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "stats": stats
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "error": e.to_string()
            })),
        ),
    }
}

// ====== Advanced Search Handlers ======

/// Advanced search with filters and caching
pub async fn advanced_search_handler(
    State(state): State<AppState>,
    Query(params): Query<AdvancedSearchParams>,
) -> impl IntoResponse {
    match state.search_service
        .advanced_search(&state.manga_service, params)
        .await
    {
        Ok(results) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": results.success,
                "manga": results.manga,
                "total_count": results.total_count,
                "message": results.message
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "error": e.to_string()
            })),
        ),
    }
}

#[derive(Deserialize)]
pub struct AutocompleteQuery {
    pub q: String,
    #[serde(default = "default_autocomplete_limit")]
    pub limit: u32,
}

fn default_autocomplete_limit() -> u32 {
    10
}

/// Autocomplete suggestions for search
pub async fn autocomplete_handler(
    State(state): State<AppState>,
    Query(query): Query<AutocompleteQuery>,
) -> impl IntoResponse {
    match crate::search::get_autocomplete_suggestions(
        &state.manga_service,
        &state.cache_service,
        &query.q,
        query.limit,
    )
    .await
    {
        Ok(suggestions) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "suggestions": suggestions
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "error": e.to_string()
            })),
        ),
    }
}
