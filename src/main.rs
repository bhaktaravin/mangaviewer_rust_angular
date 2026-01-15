use axum::{
    extract::{Path, Query},
    http::header::{AUTHORIZATION, CONTENT_TYPE},
    http::Method,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use dotenv::dotenv;
use reqwest;
use serde::Deserialize;
use serde_json;
use std::fs;
use std::net::SocketAddr;
use std::path::Path as StdPath;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

mod ai_service;
mod api;
mod auth_mongodb;
mod manga_service;

use ai_service::AIService;
use auth_mongodb::{login_handler, logout_handler, register_handler, AuthService};
use axum::extract::State;
use manga_service::{
    get_manga_handler, list_manga_handler, save_manga_handler, search_manga_handler,
    semantic_search_handler, MangaService,
};

// --- HEALTH ENDPOINT ---
async fn health_handler(State(manga_service): State<MangaService>) -> impl IntoResponse {
    // Check DB connectivity
    let db_status = match manga_service.db.list_collection_names(None).await {
        Ok(_) => "ok",
        Err(_) => "error",
    };

    let status = if db_status == "ok" { "ok" } else { "error" };

    let response = serde_json::json!({
        "api_status": status,
        "database": db_status,
    });

    (StatusCode::OK, serde_json::to_string(&response).unwrap())
}

// --- ADMIN ENDPOINT ---
async fn update_embeddings_admin_handler(
    State(manga_service): State<MangaService>,
    State(ai_service): State<AIService>,
) -> impl IntoResponse {
    let model = std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "llama2".to_string());
    match manga_service
        .update_all_manga_embeddings(&ai_service, &model)
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            serde_json::to_string(&serde_json::json!({
                "message": "Embeddings updated for all manga"
            }))
            .unwrap(),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            serde_json::to_string(&crate::api::ApiError {
                error: "Failed to update embeddings".to_string(),
                message: Some(e.to_string()),
            })
            .unwrap(),
        ),
    }
}

#[derive(Deserialize)]
struct MangaQuery {
    title: Option<String>,
}

#[derive(Deserialize)]
struct ChapterQuery {
    chapter: Option<String>,
    lang: Option<String>,
}

#[derive(Deserialize)]
struct DownloadQuery {
    chapter_id: String,
}

#[derive(Deserialize)]
struct DownloadFilesQuery {
    chapter_id: String,
    save_path: String,
    quality: Option<String>,
    manga_title: Option<String>,
    chapter_title: Option<String>,
}

async fn manga_handler(Query(params): Query<MangaQuery>) -> impl IntoResponse {
    let mut url = "https://api.mangadex.org/manga".to_string();

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
            Ok(text) => (StatusCode::OK, [(CONTENT_TYPE, "application/json")], text),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(CONTENT_TYPE, "application/json")],
                serde_json::to_string(&crate::api::ApiError {
                    error: "Failed to read response from MangaDex".to_string(),
                    message: None,
                })
                .unwrap(),
            ),
        },
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            [(CONTENT_TYPE, "application/json")],
            serde_json::to_string(&crate::api::ApiError {
                error: "Failed to fetch from MangaDex".to_string(),
                message: None,
            })
            .unwrap(),
        ),
    }
}

async fn chapters_handler(
    Path(manga_id): Path<String>,
    Query(params): Query<ChapterQuery>,
) -> impl IntoResponse {
    let mut url = format!("https://api.mangadex.org/manga/{}/feed", manga_id);

    let mut query_params = vec![];

    if let Some(chapter) = params.chapter {
        query_params.push(format!("chapter={}", urlencoding::encode(&chapter)));
    }

    if let Some(lang) = params.lang {
        query_params.push(format!(
            "translatedLanguage[]={}",
            urlencoding::encode(&lang)
        ));
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
            Ok(text) => (StatusCode::OK, [(CONTENT_TYPE, "application/json")], text),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(CONTENT_TYPE, "application/json")],
                serde_json::to_string(&crate::api::ApiError {
                    error: "Failed to read response from MangaDex".to_string(),
                    message: None,
                })
                .unwrap(),
            ),
        },
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            [(CONTENT_TYPE, "application/json")],
            serde_json::to_string(&crate::api::ApiError {
                error: "Failed to fetch chapters from MangaDex".to_string(),
                message: None,
            })
            .unwrap(),
        ),
    }
}

async fn download_handler(Query(params): Query<DownloadQuery>) -> impl IntoResponse {
    let client = reqwest::Client::new();

    let server_url = format!(
        "https://api.mangadex.org/at-home/server/{}",
        params.chapter_id
    );

    match client
        .get(&server_url)
        .header("User-Agent", "mangadownloader/0.1 (ravin.bhakta@gmail.com)")
        .send()
        .await
    {
        Ok(resp) => match resp.text().await {
            Ok(text) => (StatusCode::OK, [(CONTENT_TYPE, "application/json")], text),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(CONTENT_TYPE, "application/json")],
                serde_json::to_string(&crate::api::ApiError {
                    error: "Failed to read server response from MangaDex".to_string(),
                    message: None,
                })
                .unwrap(),
            ),
        },
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            [(CONTENT_TYPE, "application/json")],
            serde_json::to_string(&crate::api::ApiError {
                error: "Failed to fetch download info from MangaDex".to_string(),
                message: None,
            })
            .unwrap(),
        ),
    }
}

async fn download_files_handler(Query(params): Query<DownloadFilesQuery>) -> impl IntoResponse {
    let client = reqwest::Client::new();

    let server_url = format!(
        "https://api.mangadex.org/at-home/server/{}",
        params.chapter_id
    );

    let download_response = match client
        .get(&server_url)
        .header("User-Agent", "mangadownloader/0.1 (ravin.bhakta@gmail.com)")
        .send()
        .await
    {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => json,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    [(CONTENT_TYPE, "application/json")],
                    serde_json::to_string(&crate::api::ApiError {
                        error: "Failed to parse download info".to_string(),
                        message: None,
                    })
                    .unwrap(),
                )
            }
        },
        Err(_) => {
            return (
                StatusCode::BAD_GATEWAY,
                [(CONTENT_TYPE, "application/json")],
                serde_json::to_string(&crate::api::ApiError {
                    error: "Failed to fetch download info from MangaDex".to_string(),
                    message: None,
                })
                .unwrap(),
            )
        }
    };

    let base_url = download_response["baseUrl"].as_str().unwrap_or("");
    let chapter_hash = download_response["chapter"]["hash"].as_str().unwrap_or("");

    let quality = params.quality.as_deref().unwrap_or("high");
    let images_key = if quality == "saver" {
        "dataSaver"
    } else {
        "data"
    };
    let url_path = if quality == "saver" {
        "data-saver"
    } else {
        "data"
    };

    let empty_vec = vec![];
    let images = download_response["chapter"][images_key]
        .as_array()
        .unwrap_or(&empty_vec);

    if images.is_empty() {
        return (
            StatusCode::NOT_FOUND,
            [(CONTENT_TYPE, "application/json")],
            serde_json::to_string(&crate::api::ApiError {
                error: "No images found for this chapter".to_string(),
                message: None,
            })
            .unwrap(),
        );
    }

    let manga_title = params.manga_title.as_deref().unwrap_or("Unknown_Manga");
    let chapter_title = params
        .chapter_title
        .as_deref()
        .unwrap_or(&params.chapter_id);
    let safe_manga_title = manga_title.replace("/", "_").replace("\\", "_");
    let safe_chapter_title = chapter_title.replace("/", "_").replace("\\", "_");

    let full_save_path = format!(
        "{}/{}/{}",
        params.save_path, safe_manga_title, safe_chapter_title
    );

    if let Err(_) = fs::create_dir_all(&full_save_path) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            [(CONTENT_TYPE, "application/json")],
            serde_json::to_string(&crate::api::ApiError {
                error: "Failed to create save directory".to_string(),
                message: None,
            })
            .unwrap(),
        );
    }

    let mut downloaded_files = Vec::new();
    let mut failed_downloads = Vec::new();

    for (index, image) in images.iter().enumerate() {
        if let Some(filename) = image.as_str() {
            let image_url = format!("{}/{}/{}/{}", base_url, url_path, chapter_hash, filename);
            let page_number = format!("{:03}", index + 1);
            let extension = StdPath::new(filename)
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("jpg");
            let save_filename = format!("{}_{}.{}", safe_chapter_title, page_number, extension);
            let save_file_path = format!("{}/{}", full_save_path, save_filename);

            match client
                .get(&image_url)
                .header("User-Agent", "mangadownloader/0.1 (ravin.bhakta@gmail.com)")
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.bytes().await {
                            Ok(bytes) => {
                                if let Err(_) = tokio::fs::write(&save_file_path, &bytes).await {
                                    failed_downloads
                                        .push(format!("Page {}: Failed to save file", index + 1));
                                } else {
                                    downloaded_files.push(save_filename);
                                }
                            }
                            Err(_) => failed_downloads
                                .push(format!("Page {}: Failed to read image data", index + 1)),
                        }
                    } else {
                        failed_downloads.push(format!(
                            "Page {}: HTTP {}",
                            index + 1,
                            response.status()
                        ));
                    }
                }
                Err(_) => failed_downloads.push(format!("Page {}: Network error", index + 1)),
            }
        }
    }

    let response = serde_json::json!({
        "success": true,
        "message": format!("Downloaded {} of {} pages", downloaded_files.len(), images.len()),
        "save_path": full_save_path,
        "downloaded_files": downloaded_files,
        "failed_downloads": failed_downloads,
        "total_pages": images.len(),
        "successful_downloads": downloaded_files.len()
    });

    (
        StatusCode::OK,
        [(CONTENT_TYPE, "application/json")],
        response.to_string(),
    )
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
    // Initialize structured logging
    tracing_subscriber::fmt::init();

    dotenv().ok();

    let auth_service = match AuthService::new().await {
        Ok(service) => service,
        Err(e) => {
            println!("❌ Failed to initialize AuthService: {}", e);
            return;
        }
    };

    let manga_service = match MangaService::new().await {
        Ok(service) => service,
        Err(e) => {
            eprintln!("❌ Failed to connect to Manga Database: {}", e);
            std::process::exit(1);
        }
    };

    // --- Automatic embedding update on server start ---
    let ai_service = match AIService::new() {
        Ok(service) => service,
        Err(e) => {
            eprintln!("❌ Failed to initialize AIService: {}", e);
            std::process::exit(1);
        }
    };
    let model = std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "llama2".to_string());
    match manga_service
        .update_all_manga_embeddings(&ai_service, &model)
        .await
    {
        Ok(_) => println!("✅ Embeddings updated for all manga on startup"),
        Err(e) => println!("⚠️  Failed to update embeddings on startup: {}", e),
    }

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);

    let auth_routes = Router::new()
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/logout", post(logout_handler))
        .with_state(auth_service);

    let manga_routes = Router::new()
        .route("/api/manga/save", post(save_manga_handler))
        .route("/api/manga/:manga_id", get(get_manga_handler))
        .route("/api/manga/list", get(list_manga_handler))
        .route("/api/manga/search", get(search_manga_handler))
        .route("/api/manga/semantic-search", post(semantic_search_handler))
        .with_state(manga_service.clone())
        .with_state(ai_service.clone());

    let admin_routes = Router::new()
        .route(
            "/api/admin/update-embeddings",
            post(update_embeddings_admin_handler),
        )
        .with_state(manga_service.clone())
        .with_state(ai_service.clone());

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/health", get(health_handler))
        .route("/api/manga", get(manga_handler))
        .route("/api/manga/:manga_id/chapters", get(chapters_handler))
        .route("/api/manga/download", get(download_handler))
        .route("/api/manga/download-files", get(download_files_handler))
        .merge(auth_routes)
        .merge(manga_routes)
        .merge(admin_routes)
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("🚀 Server listening on http://{}", addr);
    println!("📚 Manga API: http://{}/api/manga?title=query", addr);
    println!(
        "📖 Chapter API: http://{}/api/manga/:manga_id/chapters",
        addr
    );
    println!(
        "📥 Download API: http://{}/api/manga/download?chapter_id=id",
        addr
    );
    println!(
        "💾 Download Files: http://{}/api/manga/download-files?chapter_id=id&save_path=path",
        addr
    );
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
