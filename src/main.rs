use axum::{
    routing::{get, post},
    response::IntoResponse,
    Router,
    http::StatusCode,
    http::header::{CONTENT_TYPE, AUTHORIZATION},
    http::Method,
    extract::Query,
};
use tower_http::cors::CorsLayer;
use tokio::net::TcpListener;
use reqwest;
use std::net::SocketAddr;
use dotenv::dotenv;
use serde::Deserialize;

mod auth_mongodb;
mod manga_service;

use auth_mongodb::{AuthService, login_handler, register_handler, logout_handler};
use manga_service::{MangaService, save_manga_handler, get_manga_handler, list_manga_handler, search_manga_handler};

#[derive(Deserialize)]
struct MangaQuery {
    title: Option<String>,
}

#[derive(Deserialize)]
struct ChapterQuery {
    manga_id: String,
    chapter: Option<String>,
    lang: Option<String>,
}

#[derive(Deserialize)]
struct DownloadQuery {
    chapter_id: String,
}

async fn manga_handler(Query(params): Query<MangaQuery>) -> impl IntoResponse {
    let mut url = "https://api.mangadx.org/manga".to_string();
    
    // Add title search parameter if provided
    if let Some(title) = params.title {
        url.push_str(&format!("?title={}", urlencoding::encode(&title)));
    }
    
    let client = reqwest::Client::new();

    match client
        .get(&url)
        .header("User-Agent", "mangadownloader/0.1 (ravin.bhakta@gmail.com)")
        .send()
        .await
    {
        Ok(resp) => match resp.text().await {
            Ok(text) => (
                StatusCode::OK,
                [(CONTENT_TYPE, "application/json")],
                text,
            ),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(CONTENT_TYPE, "application/json")],
                "Failed to read response from MangaDx".to_string(),
            ),
        },
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            [(CONTENT_TYPE, "application/json")],
            "Failed to fetch from MangaDx".to_string(),
        ),
    }
}

async fn chapters_handler(Query(params): Query<ChapterQuery>) -> impl IntoResponse {
    let mut url = format!("https://api.mangadx.org/manga/{}/feed", params.manga_id);
    
    // Add query parameters
    let mut query_params = vec![];
    
    if let Some(chapter) = params.chapter {
        query_params.push(format!("chapter={}", urlencoding::encode(&chapter)));
    }
    
    if let Some(lang) = params.lang {
        query_params.push(format!("translatedLanguage[]={}", urlencoding::encode(&lang)));
    } else {
        query_params.push("translatedLanguage[]=en".to_string());
    }
    
    query_params.push("limit=100".to_string());
    query_params.push("order[chapter]=asc".to_string());
    
    if !query_params.is_empty() {
        url.push_str(&format!("?{}", query_params.join("&")));
    }
    
    let client = reqwest::Client::new();

    match client
        .get(&url)
        .header("User-Agent", "mangadownloader/0.1 (ravin.bhakta@gmail.com)")
        .send()
        .await
    {
        Ok(resp) => match resp.text().await {
            Ok(text) => (
                StatusCode::OK,
                [(CONTENT_TYPE, "application/json")],
                text,
            ),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(CONTENT_TYPE, "application/json")],
                "Failed to read response from MangaDx".to_string(),
            ),
        },
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            [(CONTENT_TYPE, "application/json")],
            "Failed to fetch chapters from MangaDx".to_string(),
        ),
    }
}

async fn download_handler(Query(params): Query<DownloadQuery>) -> impl IntoResponse {
    let client = reqwest::Client::new();
    
    // First, get the chapter server info
    let server_url = format!("https://api.mangadx.org/at-home/server/{}", params.chapter_id);
    
    match client
        .get(&server_url)
        .header("User-Agent", "mangadownloader/0.1 (ravin.bhakta@gmail.com)")
        .send()
        .await
    {
        Ok(resp) => match resp.text().await {
            Ok(text) => (
                StatusCode::OK,
                [(CONTENT_TYPE, "application/json")],
                text,
            ),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(CONTENT_TYPE, "application/json")],
                "Failed to read server response from MangaDx".to_string(),
            ),
        },
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            [(CONTENT_TYPE, "application/json")],
            "Failed to fetch download info from MangaDx".to_string(),
        ),
    }
}

async fn root_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(CONTENT_TYPE, "text/plain")],
        "Manga API is live!",
    )
}

#[tokio::main]
async fn main() {
    // Load environment variables
    dotenv().ok();
    
    // Create auth service with MongoDB
    let auth_service = match AuthService::new().await {
        Ok(service) => service,
        Err(e) => {
            eprintln!("❌ Failed to connect to MongoDB: {}", e);
            std::process::exit(1);
        }
    };

    // Create manga service with separate manga database
    let manga_service = match MangaService::new().await {
        Ok(service) => service,
        Err(e) => {
            eprintln!("❌ Failed to connect to Manga Database: {}", e);
            std::process::exit(1);
        }
    };

    // More permissive CORS for development - Firefox compatible
    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);

    // Create router with auth routes
    let auth_routes = Router::new()
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/logout", post(logout_handler))
        .with_state(auth_service);

    // Create router with manga routes
    let manga_routes = Router::new()
        .route("/api/manga/save", post(save_manga_handler))
        .route("/api/manga/:manga_id", get(get_manga_handler))
        .route("/api/manga/list", get(list_manga_handler))
        .route("/api/manga/search", get(search_manga_handler))
        .with_state(manga_service);

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/api/manga", get(manga_handler))
        .route("/api/manga/:manga_id/chapters", get(chapters_handler))
        .route("/api/manga/download", get(download_handler))
        .merge(auth_routes)
        .merge(manga_routes)
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("🚀 Server listening on http://{}", addr);
    println!("📚 Manga API: http://{}/api/manga?title=query", addr);
    println!("📖 Chapter API: http://{}/api/manga/:manga_id/chapters", addr);
    println!("📥 Download API: http://{}/api/manga/download?chapter_id=id", addr);
    println!("🔐 Auth endpoints:");
    println!("   POST http://{}/api/auth/login", addr);
    println!("   POST http://{}/api/auth/register", addr);
    println!("   POST http://{}/api/auth/logout", addr);
    println!("📖 Manga Storage endpoints:");
    println!("   POST http://{}/api/manga/save", addr);
    println!("   GET  http://{}/api/manga/:manga_id", addr);
    println!("   GET  http://{}/api/manga/list", addr);
    println!("   GET  http://{}/api/manga/search?q=query", addr);
    println!();
    println!("✅ Server ready! (Using MongoDB storage)");

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
