#!/bin/bash

echo "🚀 DEPLOY YOUR MANGA API WITH ENGLISH FILTERING TO FLY.IO"
echo "========================================================="
echo
echo "Your English filtering manga API is ready to deploy! 🎉"
echo
echo "✅ WHAT'S READY:"
echo "  • English content filtering (search-english endpoints)"
echo "  • AI-powered search with OpenAI integration"
echo "  • MongoDB data persistence"
echo "  • Smart user messaging for language choices"
echo "  • Production-ready Dockerfile and configuration"
echo
echo "📋 DEPLOYMENT STEPS:"
echo

echo "1️⃣  INSTALL FLY.IO CLI:"
echo "   Run this command in a new terminal:"
echo "   curl -L https://fly.io/install.sh | sh"
echo "   # OR use Homebrew:"
echo "   brew install flyctl"
echo

echo "2️⃣  LOGIN TO FLY.IO:"
echo "   flyctl auth login"
echo "   # This will open your browser for authentication"
echo

echo "3️⃣  SET UP ENVIRONMENT SECRETS:"
echo "   cd $(pwd)"
echo "   flyctl secrets set \\"
echo '     MONGODB_URI="mongodb+srv://userOne:JUECc9PuA8RE5X69@cluster0.bff6seb.mongodb.net/test" \'
echo '     MONGODB_DB_NAME="manga" \'
echo '     OPENAI_API_KEY="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"'
echo

echo "4️⃣  DEPLOY YOUR API:"
echo "   flyctl deploy"
echo

echo "5️⃣  TEST YOUR DEPLOYED API:"
echo "   # Your API will be live at: https://api-nameless-haze-4648.fly.dev"
echo
echo "   # Test English filtering:"
echo "   curl 'https://api-nameless-haze-4648.fly.dev/api/manga/search-english?title=naruto'"
echo
echo "   # Test AI + English filtering:"
echo "   curl 'https://api-nameless-haze-4648.fly.dev/api/manga/smart-search-english?title=action+manga'"
echo
echo "   # Test with non-English inclusion:"
echo "   curl 'https://api-nameless-haze-4648.fly.dev/api/manga/search-english?title=naruto&include_non_english=true'"
echo

echo "🎯 AVAILABLE ENDPOINTS AFTER DEPLOYMENT:"
echo "=========================================="
echo "GET  /                                    - API information"
echo "GET  /api/manga/search                    - Regular manga search"
echo "GET  /api/manga/search-english            - 🆕 English-filtered search"
echo "GET  /api/manga/smart-search              - AI-powered search"
echo "GET  /api/manga/smart-search-english      - 🆕 AI + English filtering"
echo "GET  /api/manga/recommendations           - AI recommendations"
echo "GET  /api/manga/:id                       - Get specific manga"
echo "GET  /api/manga/:id/summary               - AI-generated summary"
echo

echo "🌟 ENGLISH FILTERING FEATURES:"
echo "==============================="
echo "✅ Automatic English content detection"
echo "✅ Smart user messaging ('X English manga found, Y additional in other languages')"
echo "✅ User choice with include_non_english=true parameter"
echo "✅ AI integration for optimized search queries"
echo "✅ Separate arrays for English and non-English content"
echo "✅ Production-ready with proper error handling"
echo

echo "📊 EXAMPLE RESPONSE (English Filtering):"
cat << 'JSON'
{
  "english_manga": [
    {"id": "123", "attributes": {"title": {"en": "Naruto"}}}
  ],
  "non_english_manga": [],
  "english_count": 1,
  "non_english_count": 2,
  "has_english_content": true,
  "message": "Showing 1 English manga. 2 additional manga available in other languages."
}
JSON

echo
echo "🚀 Ready to deploy! Run the commands above to get your API live."
echo "💡 Your English filtering feature will work perfectly in production!"

# Also run the actual deployment script if flyctl is available
if command -v flyctl &> /dev/null; then
    echo
    echo "🎉 FLYCTL IS AVAILABLE! Starting automatic deployment..."
    echo
    
    # Check if logged in
    if flyctl auth whoami &> /dev/null; then
        echo "✅ Already logged into Fly.io"
        
        # Set secrets
        echo "🔒 Setting up secrets..."
        flyctl secrets set \
            MONGODB_URI="mongodb+srv://userOne:JUECc9PuA8RE5X69@cluster0.bff6seb.mongodb.net/test" \
            MONGODB_DB_NAME="manga" \
            OPENAI_API_KEY="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"
        
        # Deploy
        echo "🚀 Deploying to Fly.io..."
        flyctl deploy
        
        if [ $? -eq 0 ]; then
            echo "🎉 DEPLOYMENT SUCCESSFUL!"
            echo
            echo "🌐 Your English Filtering Manga API is now live at:"
            echo "   https://api-nameless-haze-4648.fly.dev"
            echo
            echo "🧪 Test it now:"
            echo "   curl 'https://api-nameless-haze-4648.fly.dev/api/manga/search-english?title=naruto'"
        fi
    else
        echo "❌ Please login first: flyctl auth login"
    fi
else
    echo "💡 Install flyctl first, then run this script again for automatic deployment."
fi
