use mongodb::{Client, Database};
use std::env;

pub async fn init_database() -> Result<Database, mongodb::error::Error> {
    // Get MongoDB connection string from environment variable or use default
    let mongodb_uri = env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
    
    let database_name = env::var("DATABASE_NAME")
        .unwrap_or_else(|_| "mangaviewer".to_string());

    println!("Connecting to MongoDB at: {}", mongodb_uri);
    
    let client = Client::with_uri_str(&mongodb_uri).await?;
    
    // Test the connection
    client
        .database("admin")
        .run_command(mongodb::bson::doc! {"ping": 1})
        .await?;
    
    println!("✅ Connected to MongoDB successfully!");
    
    Ok(client.database(&database_name))
}
