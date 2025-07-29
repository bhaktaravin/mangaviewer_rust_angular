use axum::{
    routing::{get, post},
    response::IntoResponse,
    Router,
    http::StatusCode,
    http::header::CONTENT_TYPE,
};
use tower_http::cors::CorsLayer;
use tokio::net::TcpListener;
use reqwest;
use std::net::SocketAddr;
use dotenv::dotenv;

mod auth_mongodb;
mod manga_service;

use auth_mongodb::{AuthService, login_handler, register_handler, logout_handler};
use manga_service::{MangaService, save_manga_handler, get_manga_handler, list_manga_handler, search_manga_handler};

async fn manga_handler() -> impl IntoResponse {
    let url = "https://api.mangadx.org/manga";
    let client = reqwest::Client::new();

    match client
        .get(url)
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
                "Failed to read response from MangaDex".to_string(),
                
            ),
        },
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            [(CONTENT_TYPE, "application/json")],
            "Failed to fetch from MangaDex".to_string(),
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

    let cors = CorsLayer::very_permissive();

    // Create router with auth routes
    let auth_routes = Router::new()
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/logout", post(logout_handler))
        // TODO: Add profile and admin routes after fixing handler signatures
        // .route("/api/profile", get(profile_handler))
        // .route("/api/profile", post(update_profile_handler))
        // .route("/api/admin/users", get(list_users_handler))
        // .route("/api/admin/users", post(admin_user_handler))
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
        .merge(auth_routes)
        .merge(manga_routes)
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("🚀 Server listening on http://{}", addr);
    println!("📚 Manga API: http://{}/api/manga", addr);
    println!("🔐 Auth endpoints:");
    println!("   POST http://{}/api/auth/login", addr);
    println!("   POST http://{}/api/auth/register", addr);
    println!("   POST http://{}/api/auth/logout", addr);
    // println!("👤 Profile endpoints:");
    // println!("   GET  http://{}/api/profile", addr);
    // println!("   POST http://{}/api/profile", addr);
    // println!("🛡️  Admin endpoints:");
    // println!("   GET  http://{}/api/admin/users", addr);
    // println!("   POST http://{}/api/admin/users", addr);
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
