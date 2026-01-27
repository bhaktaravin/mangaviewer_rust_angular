use serde::{Deserialize, Serialize};

/// Pagination query parameters
#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_page() -> u32 {
    1
}

fn default_limit() -> u32 {
    20
}

impl PaginationParams {
    pub fn validate(&mut self) {
        // Ensure page is at least 1
        if self.page < 1 {
            self.page = 1;
        }
        
        // Limit max items per page to prevent abuse
        if self.limit < 1 {
            self.limit = 1;
        }
        if self.limit > 100 {
            self.limit = 100;
        }
    }

    pub fn skip(&self) -> u64 {
        ((self.page - 1) * self.limit) as u64
    }

    pub fn limit(&self) -> i64 {
        self.limit as i64
    }
}

/// Paginated response wrapper
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub page: u32,
    pub limit: u32,
    pub total_items: u64,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_prev: bool,
}

impl PaginationInfo {
    pub fn new(page: u32, limit: u32, total_items: u64) -> Self {
        let total_pages = ((total_items as f64) / (limit as f64)).ceil() as u32;
        
        Self {
            page,
            limit,
            total_items,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        }
    }
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, page: u32, limit: u32, total_items: u64) -> Self {
        Self {
            data,
            pagination: PaginationInfo::new(page, limit, total_items),
        }
    }
}
