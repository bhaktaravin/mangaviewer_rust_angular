use mongodb::bson::{doc, oid::ObjectId};
use mongodb::{Collection, Database};
use serde::{Deserialize, Serialize};
use std::env;

/// Reading progress for a specific manga
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReadingProgress {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: String,
    pub manga_id: String,
    pub current_chapter: String,
    pub current_page: u32,
    pub total_pages: u32,
    pub progress_percentage: f32,
    pub last_read_at: String,
    pub started_at: String,
    pub completed: bool,
    pub reading_time_minutes: u32,
}

/// User library entry with reading progress
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LibraryEntry {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: String,
    pub manga_id: String,
    pub manga_title: String,
    pub manga_cover: Option<String>,
    pub status: ReadingStatus,
    pub rating: Option<u8>, // 1-5 stars
    pub favorite: bool,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub added_at: String,
    pub updated_at: String,
    pub progress: Option<ReadingProgress>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ReadingStatus {
    PlanToRead,
    Reading,
    Completed,
    OnHold,
    Dropped,
}

#[derive(Clone)]
pub struct ProgressService {
    db: Database,
}

impl ProgressService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let mongodb_uri =
            env::var("MONGODB_URI").map_err(|_| "MONGODB_URI environment variable not set")?;
        let database_name = env::var("DATABASE_NAME").unwrap_or_else(|_| "mangaviewer".to_string());

        let client = mongodb::Client::with_uri_str(&mongodb_uri).await?;
        let database = client.database(&database_name);

        let service = ProgressService { db: database };
        service.create_indexes().await?;

        tracing::info!("✅ ProgressService initialized");
        Ok(service)
    }

    async fn create_indexes(&self) -> Result<(), Box<dyn std::error::Error>> {
        use mongodb::{options::IndexOptions, IndexModel};

        let library = self.library_collection();
        let progress = self.progress_collection();

        // Library indexes
        library
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "user_id": 1, "manga_id": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .name("user_manga_unique".to_string())
                            .build(),
                    )
                    .build(),
            )
            .await?;

        library
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "user_id": 1, "status": 1 })
                    .build(),
            )
            .await?;

        library
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "user_id": 1, "favorite": 1 })
                    .build(),
            )
            .await?;

        // Progress indexes
        progress
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "user_id": 1, "manga_id": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .name("user_manga_progress_unique".to_string())
                            .build(),
                    )
                    .build(),
            )
            .await?;

        progress
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "last_read_at": -1 })
                    .build(),
            )
            .await?;

        Ok(())
    }

    fn library_collection(&self) -> Collection<LibraryEntry> {
        self.db.collection("library")
    }

    fn progress_collection(&self) -> Collection<ReadingProgress> {
        self.db.collection("reading_progress")
    }

    /// Add manga to user's library
    pub async fn add_to_library(
        &self,
        user_id: &str,
        manga_id: &str,
        manga_title: &str,
        status: ReadingStatus,
    ) -> Result<LibraryEntry, Box<dyn std::error::Error>> {
        let library = self.library_collection();
        let now = chrono::Utc::now().to_rfc3339();

        let entry = LibraryEntry {
            id: None,
            user_id: user_id.to_string(),
            manga_id: manga_id.to_string(),
            manga_title: manga_title.to_string(),
            manga_cover: None,
            status,
            rating: None,
            favorite: false,
            tags: Vec::new(),
            notes: None,
            added_at: now.clone(),
            updated_at: now,
            progress: None,
        };

        library.insert_one(&entry).await?;
        tracing::info!("📚 Added manga {} to user {} library", manga_id, user_id);

        Ok(entry)
    }

    /// Update reading progress
    pub async fn update_progress(
        &self,
        user_id: &str,
        manga_id: &str,
        chapter: &str,
        page: u32,
        total_pages: u32,
    ) -> Result<ReadingProgress, Box<dyn std::error::Error>> {
        let progress_col = self.progress_collection();
        let now = chrono::Utc::now().to_rfc3339();

        let percentage = if total_pages > 0 {
            (page as f32 / total_pages as f32) * 100.0
        } else {
            0.0
        };

        let completed = percentage >= 100.0;

        // Try to find existing progress
        let existing = progress_col
            .find_one(doc! {
                "user_id": user_id,
                "manga_id": manga_id
            })
            .await?;

        let progress = if let Some(mut existing_progress) = existing {
            // Update existing
            existing_progress.current_chapter = chapter.to_string();
            existing_progress.current_page = page;
            existing_progress.total_pages = total_pages;
            existing_progress.progress_percentage = percentage;
            existing_progress.last_read_at = now;
            existing_progress.completed = completed;

            progress_col
                .replace_one(
                    doc! {
                        "user_id": user_id,
                        "manga_id": manga_id
                    },
                    &existing_progress,
                )
                .await?;

            existing_progress
        } else {
            // Create new
            let new_progress = ReadingProgress {
                id: None,
                user_id: user_id.to_string(),
                manga_id: manga_id.to_string(),
                current_chapter: chapter.to_string(),
                current_page: page,
                total_pages,
                progress_percentage: percentage,
                last_read_at: now.clone(),
                started_at: now,
                completed,
                reading_time_minutes: 0,
            };

            progress_col.insert_one(&new_progress).await?;
            new_progress
        };

        // Update library entry status if completed
        if completed {
            let _ = self
                .update_library_status(user_id, manga_id, ReadingStatus::Completed)
                .await;
        }

        tracing::info!(
            "📖 Updated progress for user {}, manga {}: {}%",
            user_id,
            manga_id,
            percentage
        );

        Ok(progress)
    }

    /// Get user's library with pagination
    pub async fn get_library(
        &self,
        user_id: &str,
        status: Option<ReadingStatus>,
        page: u32,
        limit: u32,
    ) -> Result<Vec<LibraryEntry>, Box<dyn std::error::Error>> {
        let library = self.library_collection();

        let mut filter = doc! { "user_id": user_id };
        if let Some(status) = status {
            filter.insert("status", serde_json::to_string(&status)?);
        }

        let skip = ((page - 1) * limit) as u64;
        let mut cursor = library
            .find(filter)
            .sort(doc! { "updated_at": -1 })
            .skip(skip)
            .limit(limit as i64)
            .await?;

        let mut entries = Vec::new();
        while cursor.advance().await? {
            entries.push(cursor.deserialize_current()?);
        }

        Ok(entries)
    }

    /// Update library entry status
    pub async fn update_library_status(
        &self,
        user_id: &str,
        manga_id: &str,
        status: ReadingStatus,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let library = self.library_collection();

        library
            .update_one(
                doc! {
                    "user_id": user_id,
                    "manga_id": manga_id
                },
                doc! {
                    "$set": {
                        "status": serde_json::to_string(&status)?,
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    }
                },
            )
            .await?;

        Ok(())
    }

    /// Remove manga from library
    pub async fn remove_from_library(
        &self,
        user_id: &str,
        manga_id: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let library = self.library_collection();

        library
            .delete_one(doc! {
                "user_id": user_id,
                "manga_id": manga_id
            })
            .await?;

        tracing::info!("🗑️ Removed manga {} from user {} library", manga_id, user_id);
        Ok(())
    }

    /// Get reading statistics for user
    pub async fn get_reading_stats(
        &self,
        user_id: &str,
    ) -> Result<ReadingStats, Box<dyn std::error::Error>> {
        let library = self.library_collection();
        let progress = self.progress_collection();

        let total_manga = library
            .count_documents(doc! { "user_id": user_id })
            .await? as u32;

        let completed = library
            .count_documents(doc! {
                "user_id": user_id,
                "status": "completed"
            })
            .await? as u32;

        let reading = library
            .count_documents(doc! {
                "user_id": user_id,
                "status": "reading"
            })
            .await? as u32;

        // Calculate total reading time
        let mut cursor = progress.find(doc! { "user_id": user_id }).await?;
        let mut total_reading_time = 0u32;

        while cursor.advance().await? {
            let prog = cursor.deserialize_current()?;
            total_reading_time += prog.reading_time_minutes;
        }

        Ok(ReadingStats {
            total_manga,
            completed,
            reading,
            plan_to_read: 0,
            total_reading_time_minutes: total_reading_time,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct ReadingStats {
    pub total_manga: u32,
    pub completed: u32,
    pub reading: u32,
    pub plan_to_read: u32,
    pub total_reading_time_minutes: u32,
}
