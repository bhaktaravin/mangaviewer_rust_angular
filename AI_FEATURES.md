# 🤖 AI-Enhanced Manga Viewer Backend

Your manga viewer backend now includes powerful AI features powered by OpenAI!

## 🚀 New AI-Powered Endpoints

### 1. Smart Search
**Endpoint:** `GET /api/manga/smart-search?query=<natural_language_query>`

Converts natural language queries into optimized search terms.

**Examples:**
```bash
# Instead of searching for exact keywords
curl "http://localhost:3000/api/manga/smart-search?query=I want action manga with superheroes"

# Or story-based queries
curl "http://localhost:3000/api/manga/smart-search?query=romance story in high school setting"
```

### 2. AI Recommendations
**Endpoint:** `GET /api/manga/recommendations?preferences=<description>&liked_manga_ids=<comma_separated_ids>`

Get personalized manga recommendations based on preferences and liked manga.

**Examples:**
```bash
# Based on preferences only
curl "http://localhost:3000/api/manga/recommendations?preferences=I like dark fantasy with complex characters"

# Based on preferences and liked manga
curl "http://localhost:3000/api/manga/recommendations?preferences=action and adventure&liked_manga_ids=manga_id_1,manga_id_2"
```

### 3. AI-Generated Summaries
**Endpoint:** `GET /api/manga/:id/summary`

Get AI-generated summaries with genre analysis and target audience identification.

**Example:**
```bash
curl "http://localhost:3000/api/manga/some-manga-id/summary"
```

## 🔧 Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Generate a new API key

### 2. Configure API Key

You have two options to provide your OpenAI API key:

**Option 1: Using .openai_key file (recommended)**
1. Create a file named `.openai_key` in the project root
2. Format it with two lines:
   ```
   OpenAI API Key File
   sk-your-actual-api-key-here
   ```
   The first line can be any comment/description, the API key should be on the second line.

**Option 2: Using environment variable**
Update your `.env` file:
```env
OPENAI_API_KEY=your_actual_api_key_here
```

The system will try to read from `.openai_key` file first, then fall back to the environment variable.

### 3. Run the Server
```bash
cargo run
```

The AI service will initialize automatically if the API key is provided. If not, the regular manga search will still work without AI features.

### 4. Test AI Features
Run the test script to verify everything works:
```bash
./test_ai.sh
```

Or test individual endpoints manually:
```bash
# Test smart search
curl "http://localhost:3000/api/manga/smart-search?query=I want action manga with ninjas"

# Test recommendations  
curl "http://localhost:3000/api/manga/recommendations?preferences=dark fantasy"
```

## 🎯 AI Features Overview

| Feature | Description | Endpoint |
|---------|-------------|----------|
| **Smart Search** | Natural language to search keywords | `/api/manga/smart-search` |
| **Recommendations** | Personalized suggestions | `/api/manga/recommendations` |
| **Summaries** | AI-generated manga analysis | `/api/manga/:id/summary` |

## 💡 Example Use Cases

### Smart Search Examples:
- "I want something like Naruto but darker"
- "Romance manga set in modern Japan"
- "Sci-fi with time travel elements"
- "Comedy manga about cooking"

### Recommendation Examples:
- Get suggestions based on reading history
- Find similar manga to favorites
- Discover new genres based on preferences

### Summary Features:
- Concise plot summaries
- Genre identification
- Target audience analysis
- Content themes extraction

## 🔄 Fallback Behavior

The system is designed to be resilient:
- If AI service fails to initialize, regular search still works
- If AI calls fail, falls back to original search queries
- All endpoints remain functional without OpenAI API key

## 🌟 Future AI Enhancements

Planned features:
- Image analysis of manga covers
- Sentiment analysis of descriptions
- Multi-language translation
- Reading progress recommendations
- Community-based collaborative filtering

---

**Note:** AI features are optional and require an OpenAI API key. The basic manga search functionality works independently of AI services.
