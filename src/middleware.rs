use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::time::Instant;
use tracing::{error, info};

/// Global error handler middleware
pub async fn error_handler_middleware(
    req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let start = Instant::now();
    let method = req.method().clone();
    let uri = req.uri().clone();

    let response = next.run(req).await;
    
    let duration = start.elapsed();
    info!(
        method = %method,
        uri = %uri,
        status = %response.status(),
        duration_ms = duration.as_millis(),
        "request completed"
    );

    Ok(response)
}

/// Request ID middleware for tracing
pub async fn request_id_middleware(
    mut req: Request,
    next: Next,
) -> Response {
    let request_id = uuid::Uuid::new_v4().to_string();
    req.extensions_mut().insert(RequestId(request_id.clone()));
    
    let mut response = next.run(req).await;
    response.headers_mut().insert(
        "x-request-id",
        request_id.parse().unwrap(),
    );
    
    response
}

/// Request ID wrapper
#[derive(Clone, Debug)]
pub struct RequestId(pub String);

/// Application-wide error type
#[derive(Debug)]
pub enum AppError {
    DatabaseError(mongodb::error::Error),
    AuthError(String),
    ValidationError(String),
    NotFound(String),
    InternalError(String),
    BadRequest(String),
    Unauthorized(String),
    Forbidden(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::DatabaseError(e) => write!(f, "Database error: {}", e),
            AppError::AuthError(msg) => write!(f, "Authentication error: {}", msg),
            AppError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::InternalError(msg) => write!(f, "Internal error: {}", msg),
            AppError::BadRequest(msg) => write!(f, "Bad request: {}", msg),
            AppError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            AppError::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match self {
            AppError::DatabaseError(ref e) => {
                error!("Database error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "DATABASE_ERROR",
                    "A database error occurred".to_string(),
                )
            }
            AppError::AuthError(ref msg) => (
                StatusCode::UNAUTHORIZED,
                "AUTH_ERROR",
                msg.clone(),
            ),
            AppError::ValidationError(ref msg) => (
                StatusCode::BAD_REQUEST,
                "VALIDATION_ERROR",
                msg.clone(),
            ),
            AppError::NotFound(ref msg) => (
                StatusCode::NOT_FOUND,
                "NOT_FOUND",
                msg.clone(),
            ),
            AppError::InternalError(ref msg) => {
                error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "An internal error occurred".to_string(),
                )
            }
            AppError::BadRequest(ref msg) => (
                StatusCode::BAD_REQUEST,
                "BAD_REQUEST",
                msg.clone(),
            ),
            AppError::Unauthorized(ref msg) => (
                StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                msg.clone(),
            ),
            AppError::Forbidden(ref msg) => (
                StatusCode::FORBIDDEN,
                "FORBIDDEN",
                msg.clone(),
            ),
        };

        let body = Json(json!({
            "error": error_type,
            "message": message,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }));

        (status, body).into_response()
    }
}

impl From<mongodb::error::Error> for AppError {
    fn from(err: mongodb::error::Error) -> Self {
        AppError::DatabaseError(err)
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        AppError::AuthError(format!("JWT error: {}", err))
    }
}
