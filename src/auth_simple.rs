use serde::{Deserialize, Serialize};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey, Algorithm};
use uuid::Uuid;
use std::env;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use axum::{
    extract::{Json, State},
    response::IntoResponse,
    http::StatusCode,
};

// JWT Claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,     // Subject (user ID)
    pub username: String,
    pub email: String,
    pub exp: usize,      // Expiration time
}

// User data structures
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub created_at: String,
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
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub user: Option<UserPublic>,
    pub token: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UserPublic {
    pub id: String,
    pub username: String,
    pub email: String,
}

// In-memory storage for testing
pub type UserStorage = Arc<Mutex<HashMap<String, User>>>;

#[derive(Clone)]
pub struct AuthService {
    users: UserStorage,
    jwt_secret: String,
}

impl AuthService {
    pub fn new() -> Self {
        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| "your-secret-key-change-in-production".to_string());
        
        Self { 
            users: Arc::new(Mutex::new(HashMap::new())),
            jwt_secret 
        }
    }

    pub async fn register(&self, req: RegisterRequest) -> Result<AuthResponse, Box<dyn std::error::Error>> {
        let mut users = self.users.lock().unwrap();

        // Check if username or email already exists
        for user in users.values() {
            if user.username == req.username || user.email == req.email {
                return Ok(AuthResponse {
                    success: false,
                    user: None,
                    token: None,
                    message: Some("Username or email already exists".to_string()),
                });
            }
        }

        // Hash password
        let password_hash = hash(&req.password, DEFAULT_COST)?;

        // Create new user
        let user_id = Uuid::new_v4().to_string();
        let new_user = User {
            id: user_id.clone(),
            username: req.username.clone(),
            email: req.email.clone(),
            password_hash,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        // Insert user into storage
        users.insert(user_id.clone(), new_user.clone());

        // Generate JWT token
        let token = self.generate_token(&new_user)?;

        Ok(AuthResponse {
            success: true,
            user: Some(UserPublic {
                id: new_user.id,
                username: new_user.username,
                email: new_user.email,
            }),
            token: Some(token),
            message: Some("Registration successful".to_string()),
        })
    }

    pub async fn login(&self, req: LoginRequest) -> Result<AuthResponse, Box<dyn std::error::Error>> {
        let users = self.users.lock().unwrap();

        // Find user by username
        let user = users.values().find(|u| u.username == req.username);

        match user {
            Some(user) => {
                // Verify password
                if verify(&req.password, &user.password_hash)? {
                    // Generate JWT token
                    let token = self.generate_token(user)?;

                    Ok(AuthResponse {
                        success: true,
                        user: Some(UserPublic {
                            id: user.id.clone(),
                            username: user.username.clone(),
                            email: user.email.clone(),
                        }),
                        token: Some(token),
                        message: Some("Login successful".to_string()),
                    })
                } else {
                    Ok(AuthResponse {
                        success: false,
                        user: None,
                        token: None,
                        message: Some("Invalid username or password".to_string()),
                    })
                }
            }
            None => Ok(AuthResponse {
                success: false,
                user: None,
                token: None,
                message: Some("Invalid username or password".to_string()),
            }),
        }
    }

    fn generate_token(&self, user: &User) -> Result<String, jsonwebtoken::errors::Error> {
        let expiration = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::hours(24))
            .expect("valid timestamp")
            .timestamp() as usize;

        let claims = Claims {
            sub: user.id.clone(),
            username: user.username.clone(),
            email: user.email.clone(),
            exp: expiration,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_ref()),
        )
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_ref()),
            &Validation::new(Algorithm::HS256),
        )
        .map(|data| data.claims)
    }
}

// Auth handlers
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
            println!("Registration error: {}", e);
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
            println!("Login error: {}", e);
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
    // Since we're using stateless JWT tokens, logout is handled client-side
    // by removing the token from storage
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "Logout successful"
        })),
    )
}
