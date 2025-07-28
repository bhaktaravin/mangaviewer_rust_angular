// Unit test for English filtering logic
#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn create_test_manga(title_en: Option<&str>, desc_en: Option<&str>, orig_lang: Option<&str>) -> MangaData {
        let mut title = HashMap::new();
        let mut description = HashMap::new();
        
        if let Some(en_title) = title_en {
            title.insert("en".to_string(), en_title.to_string());
        }
        title.insert("ja".to_string(), "日本語タイトル".to_string());
        
        if let Some(en_desc) = desc_en {
            description.insert("en".to_string(), en_desc.to_string());
        }
        description.insert("ja".to_string(), "日本語説明".to_string());

        MangaData {
            id: "test".to_string(),
            item_type: "manga".to_string(),
            attributes: MangaAttributes {
                title,
                description,
                status: "ongoing".to_string(),
                last_volume: None,
                last_chapter: None,
                original_language: orig_lang.map(|s| s.to_string()),
                year: Some(2023),
                content_rating: Some("safe".to_string()),
                created_at: "2023-01-01T00:00:00Z".to_string(),
                updated_at: "2023-01-01T00:00:00Z".to_string(),
                version: 1,
                latest_uploaded_chapter: None,
            },
        }
    }

    #[test]
    fn test_has_english_title() {
        let manga = create_test_manga(Some("Naruto"), None, None);
        assert!(MangaDexClient::has_english_content(&manga));
    }

    #[test]
    fn test_has_english_description() {
        let manga = create_test_manga(None, Some("English description"), None);
        assert!(MangaDexClient::has_english_content(&manga));
    }

    #[test]
    fn test_has_english_original_language() {
        let manga = create_test_manga(None, None, Some("en"));
        assert!(MangaDexClient::has_english_content(&manga));
    }

    #[test]
    fn test_no_english_content() {
        let manga = create_test_manga(None, None, Some("ja"));
        assert!(!MangaDexClient::has_english_content(&manga));
    }

    #[test]
    fn test_filter_manga_by_language() {
        let manga_list = vec![
            create_test_manga(Some("Naruto"), None, None),          // English
            create_test_manga(None, None, Some("ko")),              // Korean
            create_test_manga(None, Some("English desc"), None),    // English
        ];

        let (english, non_english) = MangaDexClient::filter_manga_by_language(&manga_list);
        
        assert_eq!(english.len(), 2);
        assert_eq!(non_english.len(), 1);
    }
}

// Run tests with: cargo test
