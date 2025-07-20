use axum::{
    routing::get,
    response::IntoResponse,
    Router,
    http::StatusCode,
    http::header::{CONTENT_TYPE, HeaderValue},
};
use tower_http::cors::{CorsLayer, Any};
use tokio::net::TcpListener;
use reqwest;
use std::net::SocketAddr;

async fn manga_handler() -> impl IntoResponse {

    let url = "https://api.mangadex.org/manga";
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

#[tokio::main]
async fn main() {
    let cors = CorsLayer::very_permissive();


    let app = Router::new()
        .route("/manga", get(manga_handler))
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Listening on http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
