use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::{Client, Collection, Database};
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

// JWT Claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // Subject (user ID)
    pub username: String,
    pub email: String,
    pub exp: usize, // Expiration time
}

// User data structures for MongoDB
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: String, // UUID as string
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_admin: bool,
    pub is_active: bool,
    pub profile: UserProfile,
    pub reading_stats: ReadingStats,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserProfile {
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub favorite_genres: Vec<String>,
    pub reading_preferences: ReadingPreferences,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReadingPreferences {
    pub preferred_language: String,
    pub mature_content: bool,
    pub notifications_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReadingStats {
    pub total_manga_read: i32,
    pub total_chapters_read: i32,
    pub reading_streak_days: i32,
    pub favorite_manga_ids: Vec<String>,
    pub currently_reading: Vec<String>,
    pub completed: Vec<String>,
    pub plan_to_read: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
    pub favorite_genres: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub favorite_genres: Option<Vec<String>>,
    pub preferred_language: Option<String>,
    pub mature_content: Option<bool>,
    pub notifications_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AdminUserRequest {
    pub user_id: String,
    pub action: AdminAction,
}

#[derive(Debug, Deserialize)]
pub enum AdminAction {
    #[serde(rename = "activate")]
    Activate,
    #[serde(rename = "deactivate")]
    Deactivate,
    #[serde(rename = "delete")]
    Delete,
    #[serde(rename = "make_admin")]
    MakeAdmin,
    #[serde(rename = "remove_admin")]
    RemoveAdmin,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub user: Option<UserPublic>,
    pub token: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct UserPublic {
    pub id: String,
    pub username: String,
    pub email: String,
    pub created_at: String,
    pub is_admin: bool,
    pub is_active: bool,
    pub profile: UserProfile,
    pub reading_stats: ReadingStats,
}

#[derive(Debug, Serialize)]
pub struct UserListResponse {
    pub success: bool,
    pub users: Option<Vec<UserPublic>>,
    pub total_count: Option<i64>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdminResponse {
    pub success: bool,
    pub message: String,
    pub affected_user: Option<UserPublic>,
}

#[derive(Clone)]
pub struct AuthService {
    db: Database,
    jwt_secret: String,
}

impl AuthService {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let mongodb_uri =
            env::var("MONGODB_URI").map_err(|_| "MONGODB_URI environment variable not set")?;
        let database_name = env::var("DATABASE_NAME").unwrap_or_else(|_| "mangaviewer".to_string());

        tracing::info!("🔗 Connecting to MongoDB...");
        tracing::info!(
            "📍 URI: {}",
            mongodb_uri.chars().take(20).collect::<String>() + "..."
        );
        tracing::info!("🗄️  Database: {}", database_name);

        let client = Client::with_uri_str(&mongodb_uri).await.map_err(|e| {
            tracing::error!("❌ Failed to create MongoDB client: {}", e);
            e
        })?;

        // Test the connection
        match client.list_database_names().await {
            Ok(db_names) => {
                tracing::info!("✅ Successfully connected to MongoDB");
                tracing::info!("📋 Available databases: {:?}", db_names);
            }
            Err(e) => {
                tracing::error!("❌ Failed to connect to MongoDB: {}", e);
                return Err(Box::new(e));
            }
        }

        let database = client.database(&database_name);
        tracing::info!("📚 Selected database: {}", database_name);

        let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| {
            tracing::warn!(
                "⚠️  Warning: JWT_SECRET not set, using default (not secure for production)"
            );
            "default-secret-key".to_string()
        });

        // Create indexes for better performance and uniqueness
        let _users_collection = database.collection::<User>("users");
        tracing::info!("🔧 Creating database indexes...");

        // Create the AuthService temporarily to call the method
        let temp_service = AuthService {
            db: database.clone(),
            jwt_secret: jwt_secret.clone(),
        };

        match temp_service.create_indexes().await {
            Ok(_) => tracing::info!("✅ Database indexes created successfully"),
            Err(e) => tracing::warn!("⚠️  Warning: Failed to create indexes: {}", e),
        }

        tracing::info!("🚀 AuthService initialized successfully");

        Ok(AuthService {
            db: database,
            jwt_secret,
        })
    }
    async fn create_indexes(&self) -> Result<(), Box<dyn std::error::Error>> {
        let users = self.users_collection();

        // Create compound index for username and email (unique)
        users
            .create_index(
                mongodb::IndexModel::builder()
                    .keys(doc! { "username": 1 })
                    .options(
                        mongodb::options::IndexOptions::builder()
                            .unique(true)
                            .name("username_unique".to_string())
                            .build(),
                    )
                    .build(),
            )
            .await?;

        users
            .create_index(
                mongodb::IndexModel::builder()
                    .keys(doc! { "email": 1 })
                    .options(
                        mongodb::options::IndexOptions::builder()
                            .unique(true)
                            .name("email_unique".to_string())
                            .build(),
                    )
                    .build(),
            )
            .await?;

        // Index for user_id for fast lookups
        users
            .create_index(
                mongodb::IndexModel::builder()
                    .keys(doc! { "user_id": 1 })
                    .options(
                        mongodb::options::IndexOptions::builder()
                            .unique(true)
                            .name("user_id_unique".to_string())
                            .build(),
                    )
                    .build(),
            )
            .await?;

        // Index for admin queries
        users
            .create_index(
                mongodb::IndexModel::builder()
                    .keys(doc! { "is_admin": 1, "is_active": 1 })
                    .options(
                        mongodb::options::IndexOptions::builder()
                            .name("admin_active_index".to_string())
                            .build(),
                    )
                    .build(),
            )
            .await?;

        // Index for created_at for sorting
        users
            .create_index(
                mongodb::IndexModel::builder()
                    .keys(doc! { "created_at": -1 })
                    .options(
                        mongodb::options::IndexOptions::builder()
                            .name("created_at_desc".to_string())
                            .build(),
                    )
                    .build(),
            )
            .await?;

        Ok(())
    }

    fn users_collection(&self) -> Collection<User> {
        self.db.collection("users")
    }

    pub async fn register(
        &self,
        req: RegisterRequest,
    ) -> Result<AuthResponse, Box<dyn std::error::Error>> {
        let users = self.users_collection();

        tracing::info!(
            "🔍 Checking for existing user with username: {} or email: {}",
            req.username,
            req.email
        );

        // Check if username or email already exists
        let existing_user = users
            .find_one(doc! {
                "$or": [
                    {"username": &req.username},
                    {"email": &req.email}
                ]
            })
            .await?;

        if let Some(existing) = existing_user {
            tracing::warn!("❌ Found existing user: {:?}", existing.username);
            return Ok(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("Username or email already exists".to_string()),
            });
        }

        tracing::info!("✅ No existing user found, proceeding with registration");

        // Debug: Let's see what users exist in the database
        tracing::debug!("🔍 Debug: Checking all users in database...");
        let mut cursor = users.find(doc! {}).await?;
        let mut user_count = 0;
        while cursor.advance().await? {
            let user = cursor.deserialize_current()?;
            user_count += 1;
            tracing::debug!(
                "   Found user #{}: {} ({})",
                user_count,
                user.username,
                user.email
            );
        }
        tracing::info!("📊 Total users in database: {}", user_count);

        // Hash password
        let password_hash = hash(&req.password, DEFAULT_COST)?;

        // Create new user with profile
        let user_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let user = User {
            id: None, // MongoDB will generate the ObjectId
            user_id: user_id.clone(),
            username: req.username.clone(),
            email: req.email.clone(),
            password_hash,
            created_at: now.clone(),
            updated_at: now.clone(),
            is_admin: false, // First user could be admin, but we'll handle this separately
            is_active: true,
            profile: UserProfile {
                display_name: req
                    .display_name
                    .clone()
                    .or_else(|| Some(req.username.clone())),
                bio: None,
                avatar_url: None,
                favorite_genres: req.favorite_genres.unwrap_or_default(),
                reading_preferences: ReadingPreferences {
                    preferred_language: "en".to_string(),
                    mature_content: false,
                    notifications_enabled: true,
                },
            },
            reading_stats: ReadingStats {
                total_manga_read: 0,
                total_chapters_read: 0,
                reading_streak_days: 0,
                favorite_manga_ids: Vec::new(),
                currently_reading: Vec::new(),
                completed: Vec::new(),
                plan_to_read: Vec::new(),
            },
        };

        tracing::info!(
            "🔄 Attempting to insert user into MongoDB: {}",
            req.username
        );

        // Insert user into MongoDB
        match users.insert_one(&user).await {
            Ok(result) => {
                tracing::info!(
                    "✅ Successfully inserted user with ID: {:?}",
                    result.inserted_id
                );
            }
            Err(e) => {
                tracing::error!("❌ Failed to insert user into database: {}", e);
                return Ok(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some(format!("Failed to create user: {}", e)),
                });
            }
        }

        // Generate JWT token
        let token = self.generate_token(&user_id, &req.username, &req.email)?;

        Ok(AuthResponse {
            success: true,
            user: Some(UserPublic {
                id: user_id,
                username: req.username,
                email: req.email,
                created_at: user.created_at,
                is_admin: user.is_admin,
                is_active: user.is_active,
                profile: user.profile,
                reading_stats: user.reading_stats,
            }),
            token: Some(token),
            message: Some("Registration successful".to_string()),
        })
    }

    pub async fn login(
        &self,
        req: LoginRequest,
    ) -> Result<AuthResponse, Box<dyn std::error::Error>> {
        let users = self.users_collection();

        // Find user by username
        let user = users.find_one(doc! {"username": &req.username}).await?;

        if let Some(user) = user {
            // Check if user is active
            if !user.is_active {
                return Ok(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("Account is deactivated. Please contact support.".to_string()),
                });
            }

            // Verify password
            if verify(&req.password, &user.password_hash)? {
                // Generate JWT token
                let token = self.generate_token(&user.user_id, &user.username, &user.email)?;

                return Ok(AuthResponse {
                    success: true,
                    user: Some(UserPublic {
                        id: user.user_id,
                        username: user.username,
                        email: user.email,
                        created_at: user.created_at,
                        is_admin: user.is_admin,
                        is_active: user.is_active,
                        profile: user.profile,
                        reading_stats: user.reading_stats,
                    }),
                    token: Some(token),
                    message: Some("Login successful".to_string()),
                });
            }
        }

        Ok(AuthResponse {
            success: false,
            user: None,
            token: None,
            message: Some("Invalid username or password".to_string()),
        })
    }

    fn generate_token(
        &self,
        user_id: &str,
        username: &str,
        email: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let expiration = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::hours(24))
            .expect("valid timestamp")
            .timestamp();

        let claims = Claims {
            sub: user_id.to_string(),
            username: username.to_string(),
            email: email.to_string(),
            exp: expiration as usize,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )?;

        Ok(token)
    }

    pub async fn verify_token(&self, token: &str) -> Result<Claims, Box<dyn std::error::Error>> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        )?;

        Ok(token_data.claims)
    }

    pub async fn get_user_by_id(
        &self,
        user_id: &str,
    ) -> Result<Option<User>, Box<dyn std::error::Error>> {
        let users = self.users_collection();
        let user = users.find_one(doc! {"user_id": user_id}).await?;
        Ok(user)
    }

    pub async fn update_profile(
        &self,
        user_id: &str,
        req: UpdateProfileRequest,
    ) -> Result<AuthResponse, Box<dyn std::error::Error>> {
        let users = self.users_collection();

        let mut update_doc = doc! {
            "updated_at": chrono::Utc::now().to_rfc3339()
        };

        if let Some(display_name) = req.display_name {
            update_doc.insert("profile.display_name", display_name);
        }
        if let Some(bio) = req.bio {
            update_doc.insert("profile.bio", bio);
        }
        if let Some(avatar_url) = req.avatar_url {
            update_doc.insert("profile.avatar_url", avatar_url);
        }
        if let Some(favorite_genres) = req.favorite_genres {
            update_doc.insert("profile.favorite_genres", favorite_genres);
        }
        if let Some(preferred_language) = req.preferred_language {
            update_doc.insert(
                "profile.reading_preferences.preferred_language",
                preferred_language,
            );
        }
        if let Some(mature_content) = req.mature_content {
            update_doc.insert("profile.reading_preferences.mature_content", mature_content);
        }
        if let Some(notifications_enabled) = req.notifications_enabled {
            update_doc.insert(
                "profile.reading_preferences.notifications_enabled",
                notifications_enabled,
            );
        }

        let result = users
            .update_one(doc! {"user_id": user_id}, doc! {"$set": update_doc})
            .await?;

        if result.matched_count == 0 {
            return Ok(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("User not found".to_string()),
            });
        }

        // Get updated user
        if let Some(updated_user) = self.get_user_by_id(user_id).await? {
            Ok(AuthResponse {
                success: true,
                user: Some(UserPublic {
                    id: updated_user.user_id,
                    username: updated_user.username,
                    email: updated_user.email,
                    created_at: updated_user.created_at,
                    is_admin: updated_user.is_admin,
                    is_active: updated_user.is_active,
                    profile: updated_user.profile,
                    reading_stats: updated_user.reading_stats,
                }),
                token: None,
                message: Some("Profile updated successfully".to_string()),
            })
        } else {
            Ok(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("Failed to retrieve updated user".to_string()),
            })
        }
    }

    pub async fn list_users(
        &self,
        admin_user_id: &str,
        page: Option<i64>,
        limit: Option<i64>,
    ) -> Result<UserListResponse, Box<dyn std::error::Error>> {
        // Verify admin permissions
        if let Some(admin_user) = self.get_user_by_id(admin_user_id).await? {
            if !admin_user.is_admin {
                return Ok(UserListResponse {
                    success: false,
                    users: None,
                    total_count: None,
                    message: Some("Insufficient permissions".to_string()),
                });
            }
        } else {
            return Ok(UserListResponse {
                success: false,
                users: None,
                total_count: None,
                message: Some("Admin user not found".to_string()),
            });
        }

        let users = self.users_collection();

        // Get total count
        let total_count = users.count_documents(doc! {}).await?;

        // Apply pagination
        let page = page.unwrap_or(1).max(1);
        let limit = limit.unwrap_or(10).min(100); // Max 100 users per page
        let skip = (page - 1) * limit;

        let mut cursor = users
            .find(doc! {})
            .sort(doc! {"created_at": -1})
            .skip(skip as u64)
            .limit(limit)
            .await?;

        let mut user_list = Vec::new();
        while cursor.advance().await? {
            let user = cursor.deserialize_current()?;
            user_list.push(UserPublic {
                id: user.user_id,
                username: user.username,
                email: user.email,
                created_at: user.created_at,
                is_admin: user.is_admin,
                is_active: user.is_active,
                profile: user.profile,
                reading_stats: user.reading_stats,
            });
        }

        Ok(UserListResponse {
            success: true,
            users: Some(user_list.clone()),
            total_count: Some(total_count as i64),
            message: Some(format!("Retrieved {} users", user_list.len())),
        })
    }

    pub async fn admin_manage_user(
        &self,
        admin_user_id: &str,
        req: AdminUserRequest,
    ) -> Result<AdminResponse, Box<dyn std::error::Error>> {
        // Verify admin permissions
        if let Some(admin_user) = self.get_user_by_id(admin_user_id).await? {
            if !admin_user.is_admin {
                return Ok(AdminResponse {
                    success: false,
                    message: "Insufficient permissions".to_string(),
                    affected_user: None,
                });
            }
        } else {
            return Ok(AdminResponse {
                success: false,
                message: "Admin user not found".to_string(),
                affected_user: None,
            });
        }

        let users = self.users_collection();

        match req.action {
            AdminAction::Activate => {
                let result = users.update_one(
                    doc! {"user_id": &req.user_id},
                    doc! {"$set": {"is_active": true, "updated_at": chrono::Utc::now().to_rfc3339()}}
                ).await?;

                if result.matched_count > 0 {
                    let user = self.get_user_by_id(&req.user_id).await?;
                    Ok(AdminResponse {
                        success: true,
                        message: "User activated successfully".to_string(),
                        affected_user: user.map(|u| UserPublic {
                            id: u.user_id,
                            username: u.username,
                            email: u.email,
                            created_at: u.created_at,
                            is_admin: u.is_admin,
                            is_active: u.is_active,
                            profile: u.profile,
                            reading_stats: u.reading_stats,
                        }),
                    })
                } else {
                    Ok(AdminResponse {
                        success: false,
                        message: "User not found".to_string(),
                        affected_user: None,
                    })
                }
            }
            AdminAction::Deactivate => {
                let result = users.update_one(
                    doc! {"user_id": &req.user_id},
                    doc! {"$set": {"is_active": false, "updated_at": chrono::Utc::now().to_rfc3339()}}
                ).await?;

                if result.matched_count > 0 {
                    Ok(AdminResponse {
                        success: true,
                        message: "User deactivated successfully".to_string(),
                        affected_user: None,
                    })
                } else {
                    Ok(AdminResponse {
                        success: false,
                        message: "User not found".to_string(),
                        affected_user: None,
                    })
                }
            }
            AdminAction::Delete => {
                let user_to_delete = self.get_user_by_id(&req.user_id).await?;

                // Prevent deleting another admin unless you're a super admin
                if let Some(ref user) = user_to_delete {
                    if user.is_admin && user.user_id != admin_user_id {
                        return Ok(AdminResponse {
                            success: false,
                            message: "Cannot delete another admin user".to_string(),
                            affected_user: None,
                        });
                    }
                }

                let result = users.delete_one(doc! {"user_id": &req.user_id}).await?;

                if result.deleted_count > 0 {
                    Ok(AdminResponse {
                        success: true,
                        message: "User deleted successfully".to_string(),
                        affected_user: None,
                    })
                } else {
                    Ok(AdminResponse {
                        success: false,
                        message: "User not found".to_string(),
                        affected_user: None,
                    })
                }
            }
            AdminAction::MakeAdmin => {
                let result = users.update_one(
                    doc! {"user_id": &req.user_id},
                    doc! {"$set": {"is_admin": true, "updated_at": chrono::Utc::now().to_rfc3339()}}
                ).await?;

                if result.matched_count > 0 {
                    Ok(AdminResponse {
                        success: true,
                        message: "User promoted to admin successfully".to_string(),
                        affected_user: None,
                    })
                } else {
                    Ok(AdminResponse {
                        success: false,
                        message: "User not found".to_string(),
                        affected_user: None,
                    })
                }
            }
            AdminAction::RemoveAdmin => {
                // Prevent removing admin from self
                if req.user_id == admin_user_id {
                    return Ok(AdminResponse {
                        success: false,
                        message: "Cannot remove admin privileges from yourself".to_string(),
                        affected_user: None,
                    });
                }

                let result = users.update_one(
                    doc! {"user_id": &req.user_id},
                    doc! {"$set": {"is_admin": false, "updated_at": chrono::Utc::now().to_rfc3339()}}
                ).await?;

                if result.matched_count > 0 {
                    Ok(AdminResponse {
                        success: true,
                        message: "Admin privileges removed successfully".to_string(),
                        affected_user: None,
                    })
                } else {
                    Ok(AdminResponse {
                        success: false,
                        message: "User not found".to_string(),
                        affected_user: None,
                    })
                }
            }
        }
    }
}

// HTTP Handlers
pub async fn register_handler(
    State(auth_service): State<AuthService>,
    Json(req): Json<RegisterRequest>,
) -> impl IntoResponse {
    match auth_service.register(req).await {
        Ok(response) => {
            let status = if response.success {
                StatusCode::CREATED
            } else {
                StatusCode::BAD_REQUEST
            };
            (status, Json(response))
        }
        Err(e) => {
            tracing::error!("Registration error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("Internal server error".to_string()),
                }),
            )
        }
    }
}

pub async fn login_handler(
    State(auth_service): State<AuthService>,
    Json(req): Json<LoginRequest>,
) -> impl IntoResponse {
    match auth_service.login(req).await {
        Ok(response) => {
            let status = if response.success {
                StatusCode::OK
            } else {
                StatusCode::UNAUTHORIZED
            };
            (status, Json(response))
        }
        Err(e) => {
            tracing::error!("Login error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("Internal server error".to_string()),
                }),
            )
        }
    }
}

pub async fn logout_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(AuthResponse {
            success: true,
            user: None,
            token: None,
            message: Some("Logout successful".to_string()),
        }),
    )
}

// Extract JWT token from Authorization header
fn extract_token_from_header(headers: &HeaderMap) -> Option<String> {
    if let Some(auth_header) = headers.get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if auth_str.starts_with("Bearer ") {
                return Some(auth_str[7..].to_string());
            }
        }
    }
    None
}

pub async fn profile_handler(
    State(auth_service): State<AuthService>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let token = match extract_token_from_header(&headers) {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("No authorization token provided".to_string()),
                }),
            )
        }
    };

    match auth_service.verify_token(&token).await {
        Ok(claims) => match auth_service.get_user_by_id(&claims.sub).await {
            Ok(Some(user)) => {
                if !user.is_active {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(AuthResponse {
                            success: false,
                            user: None,
                            token: None,
                            message: Some("Account is deactivated".to_string()),
                        }),
                    );
                }

                (
                    StatusCode::OK,
                    Json(AuthResponse {
                        success: true,
                        user: Some(UserPublic {
                            id: user.user_id,
                            username: user.username,
                            email: user.email,
                            created_at: user.created_at,
                            is_admin: user.is_admin,
                            is_active: user.is_active,
                            profile: user.profile,
                            reading_stats: user.reading_stats,
                        }),
                        token: None,
                        message: Some("Profile retrieved successfully".to_string()),
                    }),
                )
            }
            Ok(None) => (
                StatusCode::NOT_FOUND,
                Json(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("User not found".to_string()),
                }),
            ),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("Internal server error".to_string()),
                }),
            ),
        },
        Err(_) => (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("Invalid token".to_string()),
            }),
        ),
    }
}

pub async fn update_profile_handler(
    State(auth_service): State<AuthService>,
    headers: HeaderMap,
    Json(req): Json<UpdateProfileRequest>,
) -> impl IntoResponse {
    let token = match extract_token_from_header(&headers) {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("No authorization token provided".to_string()),
                }),
            )
        }
    };

    match auth_service.verify_token(&token).await {
        Ok(claims) => match auth_service.update_profile(&claims.sub, req).await {
            Ok(response) => (StatusCode::OK, Json(response)),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("Internal server error".to_string()),
                }),
            ),
        },
        Err(_) => (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("Invalid token".to_string()),
            }),
        ),
    }
}

#[derive(serde::Deserialize)]
pub struct PaginationQuery {
    page: Option<i64>,
    limit: Option<i64>,
}

pub async fn list_users_handler(
    State(auth_service): State<AuthService>,
    headers: HeaderMap,
    Query(pagination): Query<PaginationQuery>,
) -> impl IntoResponse {
    let token = match extract_token_from_header(&headers) {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(UserListResponse {
                    success: false,
                    users: None,
                    total_count: None,
                    message: Some("No authorization token provided".to_string()),
                }),
            )
        }
    };

    match auth_service.verify_token(&token).await {
        Ok(claims) => {
            match auth_service
                .list_users(&claims.sub, pagination.page, pagination.limit)
                .await
            {
                Ok(response) => (StatusCode::OK, Json(response)),
                Err(_) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(UserListResponse {
                        success: false,
                        users: None,
                        total_count: None,
                        message: Some("Internal server error".to_string()),
                    }),
                ),
            }
        }
        Err(_) => (
            StatusCode::UNAUTHORIZED,
            Json(UserListResponse {
                success: false,
                users: None,
                total_count: None,
                message: Some("Invalid token".to_string()),
            }),
        ),
    }
}

pub async fn admin_user_handler(
    State(auth_service): State<AuthService>,
    headers: HeaderMap,
    Json(req): Json<AdminUserRequest>,
) -> impl IntoResponse {
    let token = match extract_token_from_header(&headers) {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(AdminResponse {
                    success: false,
                    message: "No authorization token provided".to_string(),
                    affected_user: None,
                }),
            )
        }
    };

    match auth_service.verify_token(&token).await {
        Ok(claims) => match auth_service.admin_manage_user(&claims.sub, req).await {
            Ok(response) => (StatusCode::OK, Json(response)),
            Err(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AdminResponse {
                    success: false,
                    message: "Internal server error".to_string(),
                    affected_user: None,
                }),
            ),
        },
        Err(_) => (
            StatusCode::UNAUTHORIZED,
            Json(AdminResponse {
                success: false,
                message: "Invalid token".to_string(),
                affected_user: None,
            }),
        ),
    }
}
