// Minimal test server to check if the basic setup works
use axum::{
    response::Json,
    routing::get,
    Router,
};
use serde_json::{json, Value};

async fn hello() -> Json<Value> {
    Json(json!({
        "message": "Hello from Manga API!",
        "status": "working"
    }))
}

async fn test_search() -> Json<Value> {
    Json(json!({
        "english_manga": [],
        "non_english_manga": [],
        "english_count": 0,
        "non_english_count": 0,
        "total": 0,
        "has_english_content": false,
        "message": "Test endpoint working"
    }))
}

#[tokio::main]
async fn main() {
    println!("Starting minimal test server...");
    
    let app = Router::new()
        .route("/", get(hello))
        .route("/api/manga/search-english", get(test_search));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    println!("Test server running on http://localhost:3001");
    println!("Try: curl http://localhost:3001/");
    println!("Try: curl http://localhost:3001/api/manga/search-english");
    
    axum::serve(listener, app).await.unwrap();
}
