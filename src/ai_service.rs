// src/ai_service.rs

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use crate::api::{MangaData, MangaDexClientError};

#[derive(Debug, Serialize)]
struct CohereEmbedRequest {
    texts: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct CohereEmbedResponse {
    embeddings: Vec<Vec<f32>>,
}

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Debug, Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIResponseMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponseMessage {
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MangaRecommendation {
    pub search_query: String,
    pub reasoning: String,
    pub confidence_score: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MangaSummary {
    pub title: String,
    pub summary: String,
    pub genres: Vec<String>,
    pub target_audience: String,
}

pub struct AIService {
    client: Client,
    api_key: String,
    cohere_key: String,
    ollama_url: String,
}

impl AIService {
    pub fn new() -> Result<Self, String> {
        // Try to read API key from file first, then fall back to environment variable
        let api_key = Self::read_api_key_from_file()
            .or_else(|_| env::var("OPENAI_API_KEY").map_err(|_| "OPENAI_API_KEY not found".to_string()))?;
        
        let client = Client::builder()
            .user_agent("MangaViewer-AI/1.0")
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

        let cohere_key = env::var("COHERE_API_KEY").map_err(|_| "COHERE_API_KEY not found".to_string())?;
        let ollama_url = env::var("OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434".to_string());

        Ok(AIService { client, api_key, cohere_key, ollama_url })
    }
        // Ollama embedding function
        pub async fn embed_with_ollama(&self, text: &str, model: &str) -> Result<Vec<f32>, MangaDexClientError> {
            #[derive(Serialize)]
            struct OllamaEmbedRequest {
                model: String,
                prompt: String,
            }
            #[derive(Deserialize)]
            struct OllamaEmbedResponse {
                embedding: Vec<f32>,
            }
            let request = OllamaEmbedRequest {
                model: model.to_string(),
                prompt: text.to_string(),
            };
            let url = format!("{}/api/embeddings", self.ollama_url);
            let response = self
                .client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&request)
                .send()
                .await
                .map_err(|e| MangaDexClientError::Reqwest(e))?;

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(MangaDexClientError::RequestFailed(format!("Ollama API error: {}", error_text)));
            }

            let ollama_response: OllamaEmbedResponse = response
                .json()
                .await
                .map_err(|e| MangaDexClientError::RequestFailed(format!("Failed to parse Ollama response: {}", e)))?;

            Ok(ollama_response.embedding)
        }
    pub async fn embed_with_cohere(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>, MangaDexClientError> {
        let request = CohereEmbedRequest { texts };
        let response = self
            .client
            .post("https://api.cohere.ai/v1/embed")
            .header("Authorization", format!("Bearer {}", self.cohere_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| MangaDexClientError::Reqwest(e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(MangaDexClientError::RequestFailed(format!("Cohere API error: {}", error_text)));
        }

        let cohere_response: CohereEmbedResponse = response
            .json()
            .await
            .map_err(|e| MangaDexClientError::RequestFailed(format!("Failed to parse Cohere response: {}", e)))?;

        Ok(cohere_response.embeddings)
    }

    fn read_api_key_from_file() -> Result<String, String> {
        // Read the .openai_key file from the current directory
        let file_content = fs::read_to_string(".openai_key")
            .map_err(|e| format!("Failed to read .openai_key file: {}", e))?;
        
        // Split into lines and get the second line (index 1)
        let lines: Vec<&str> = file_content.lines().collect();
        if lines.len() < 2 {
            return Err("File .openai_key must have at least 2 lines".to_string());
        }
        
        let api_key = lines[1].trim();
        if api_key.is_empty() {
            return Err("API key on line 2 is empty".to_string());
        }
        
        Ok(api_key.to_string())
    }

    pub async fn get_manga_recommendations(
        &self,
        user_preferences: &str,
        liked_manga: &[MangaData],
    ) -> Result<MangaRecommendation, MangaDexClientError> {
        let liked_titles: Vec<String> = liked_manga
            .iter()
            .map(|manga| {
                manga.attributes.title
                    .get("en")
                    .or_else(|| manga.attributes.title.values().next())
                    .unwrap_or(&manga.id)
                    .clone()
            })
            .collect();

        let prompt = format!(
            "Based on the user's preferences: '{}' and their liked manga: {:?}, \
            suggest a search query for finding similar manga. \
            Respond in JSON format with: {{\"search_query\": \"...\", \"reasoning\": \"...\", \"confidence_score\": 0.0-1.0}}",
            user_preferences,
            liked_titles
        );

        let response = self.call_openai(&prompt).await?;
        
        serde_json::from_str::<MangaRecommendation>(&response)
            .map_err(|e| MangaDexClientError::RequestFailed(
                format!("Failed to parse AI response: {}", e)
            ))
    }

    pub async fn generate_manga_summary(
        &self,
        manga: &MangaData,
    ) -> Result<MangaSummary, MangaDexClientError> {
        let title = manga.attributes.title
            .get("en")
            .or_else(|| manga.attributes.title.values().next())
            .unwrap_or(&manga.id);

        let description = manga.attributes.description
            .get("en")
            .or_else(|| manga.attributes.description.values().next())
            .map_or("No description available", |v| v);

        let prompt = format!(
            "Analyze this manga and provide a concise summary:\n\
            Title: {}\n\
            Description: {}\n\
            Status: {}\n\n\
            Respond in JSON format with: {{\
                \"title\": \"...\", \
                \"summary\": \"...\", \
                \"genres\": [...], \
                \"target_audience\": \"...\"\
            }}",
            title, description, manga.attributes.status
        );

        let response = self.call_openai(&prompt).await?;
        
        serde_json::from_str::<MangaSummary>(&response)
            .map_err(|e| MangaDexClientError::RequestFailed(
                format!("Failed to parse AI response: {}", e)
            ))
    }

    pub async fn semantic_search_query(
        &self,
        natural_language_query: &str,
    ) -> Result<String, MangaDexClientError> {
        let prompt = format!(
            "Convert this natural language query into effective manga search keywords: '{}'\n\
            Return only the search keywords, no explanation.",
            natural_language_query
        );

        self.call_openai(&prompt).await
    }

    async fn call_openai(&self, prompt: &str) -> Result<String, MangaDexClientError> {
        let request = OpenAIRequest {
            model: "gpt-3.5-turbo".to_string(),
            messages: vec![OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            max_tokens: 500,
            temperature: 0.7,
        };

        let response = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| MangaDexClientError::Reqwest(e))?;

        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(MangaDexClientError::RequestFailed(
                format!("OpenAI API error: {}", error_text)
            ));
        }

        let openai_response: OpenAIResponse = response
            .json()
            .await
            .map_err(|e| MangaDexClientError::RequestFailed(
                format!("Failed to parse OpenAI response: {}", e)
            ))?;

        openai_response
            .choices
            .first()
            .map(|choice| choice.message.content.clone())
            .ok_or_else(|| MangaDexClientError::RequestFailed(
                "No response from OpenAI".to_string()
            ))
    }
}
