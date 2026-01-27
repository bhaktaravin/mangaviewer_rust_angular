use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

/// Rate limiter state
#[derive(Clone)]
pub struct RateLimiter {
    requests: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: usize, window_secs: u64) -> Self {
        Self {
            requests: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    pub async fn check(&self, key: &str) -> bool {
        let mut requests = self.requests.lock().await;
        let now = Instant::now();
        
        // Get or create request history for this key
        let history = requests.entry(key.to_string()).or_insert_with(Vec::new);
        
        // Remove old requests outside the time window
        history.retain(|&time| now.duration_since(time) < self.window);
        
        // Check if under limit
        if history.len() < self.max_requests {
            history.push(now);
            true
        } else {
            false
        }
    }

    pub async fn cleanup_old_entries(&self) {
        let mut requests = self.requests.lock().await;
        let now = Instant::now();
        
        // Remove entries that are completely outside the window
        requests.retain(|_, history| {
            history.retain(|&time| now.duration_since(time) < self.window * 2);
            !history.is_empty()
        });
    }
}

/// Rate limiting middleware
pub async fn rate_limit_middleware(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract IP address or use a default for rate limiting
    let ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    // Get rate limiter from extensions (should be added in app setup)
    let rate_limiter = req.extensions().get::<RateLimiter>().cloned();
    
    if let Some(limiter) = rate_limiter {
        if !limiter.check(&ip).await {
            let response = Json(json!({
                "error": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again later.",
                "retry_after": 60
            }));
            
            return Ok((StatusCode::TOO_MANY_REQUESTS, response).into_response());
        }
    }

    Ok(next.run(req).await)
}

/// Input validation helpers
pub mod validation {
    use regex::Regex;
    use once_cell::sync::Lazy;

    static EMAIL_REGEX: Lazy<Regex> = Lazy::new(|| {
        Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap()
    });

    static USERNAME_REGEX: Lazy<Regex> = Lazy::new(|| {
        Regex::new(r"^[a-zA-Z0-9_-]{3,20}$").unwrap()
    });

    pub fn validate_email(email: &str) -> Result<(), String> {
        if email.is_empty() {
            return Err("Email is required".to_string());
        }
        if !EMAIL_REGEX.is_match(email) {
            return Err("Invalid email format".to_string());
        }
        if email.len() > 100 {
            return Err("Email is too long (max 100 characters)".to_string());
        }
        Ok(())
    }

    pub fn validate_username(username: &str) -> Result<(), String> {
        if username.is_empty() {
            return Err("Username is required".to_string());
        }
        if !USERNAME_REGEX.is_match(username) {
            return Err("Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens".to_string());
        }
        Ok(())
    }

    pub fn validate_password(password: &str) -> Result<(), String> {
        if password.is_empty() {
            return Err("Password is required".to_string());
        }
        if password.len() < 8 {
            return Err("Password must be at least 8 characters".to_string());
        }
        if password.len() > 100 {
            return Err("Password is too long (max 100 characters)".to_string());
        }
        
        // Check for at least one number, one uppercase, one lowercase
        let has_number = password.chars().any(|c| c.is_numeric());
        let has_uppercase = password.chars().any(|c| c.is_uppercase());
        let has_lowercase = password.chars().any(|c| c.is_lowercase());
        
        if !has_number || !has_uppercase || !has_lowercase {
            return Err("Password must contain at least one number, one uppercase letter, and one lowercase letter".to_string());
        }
        
        Ok(())
    }

    pub fn sanitize_string(input: &str, max_length: usize) -> String {
        input
            .trim()
            .chars()
            .take(max_length)
            .collect::<String>()
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")
            .replace("/", "&#x2F;")
    }

    pub fn validate_manga_title(title: &str) -> Result<(), String> {
        if title.trim().is_empty() {
            return Err("Manga title is required".to_string());
        }
        if title.len() > 200 {
            return Err("Manga title is too long (max 200 characters)".to_string());
        }
        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_validate_email() {
            assert!(validate_email("test@example.com").is_ok());
            assert!(validate_email("invalid.email").is_err());
            assert!(validate_email("").is_err());
        }

        #[test]
        fn test_validate_username() {
            assert!(validate_username("user123").is_ok());
            assert!(validate_username("ab").is_err()); // too short
            assert!(validate_username("user@123").is_err()); // invalid char
        }

        #[test]
        fn test_validate_password() {
            assert!(validate_password("Password123").is_ok());
            assert!(validate_password("short").is_err()); // too short
            assert!(validate_password("nouppercase123").is_err()); // no uppercase
            assert!(validate_password("NOLOWERCASE123").is_err()); // no lowercase
            assert!(validate_password("NoNumber").is_err()); // no number
        }
    }
}
