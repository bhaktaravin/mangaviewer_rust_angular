use mongodb::{Client, Database};
use std::env;


pub async fn connect_to_mongodb() -> mongodb::error::Result<Database> {
    let db_uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let client = Client::with_uri_str(&db_uri).await?;
    let db_name = env::var("MONGODB_DB_NAME").unwrap_or_else(|_| "mangaviewer".to_string());
    let database = client.database(&db_name);
    tracing::info!("Connected to MongoDB database: {}", db_name);
    Ok(database)
}