#!/bin/bash

# Manga Viewer Deployment Script
# This script builds and deploys the entire application

set -e  # Exit on error

echo "🚀 Starting Manga Viewer Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo -e "${RED}❌ Error: .env.docker file not found!${NC}"
    echo "Please copy .env.docker.example to .env.docker and configure it."
    exit 1
fi

# Load environment variables
export $(cat .env.docker | grep -v '^#' | xargs)

echo -e "${BLUE}📦 Step 1: Building Frontend...${NC}"
npm install
npm run build

if [ ! -d "dist/frontend/browser" ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"

echo -e "${BLUE}🐳 Step 2: Building Docker Images...${NC}"
docker-compose build --no-cache

echo -e "${GREEN}✅ Docker images built${NC}"

echo -e "${BLUE}🔄 Step 3: Stopping existing containers...${NC}"
docker-compose down

echo -e "${BLUE}🚀 Step 4: Starting services...${NC}"
docker-compose up -d

echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
echo -e "${BLUE}🏥 Checking service health...${NC}"

# Check MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is healthy${NC}"
else
    echo -e "${RED}❌ MongoDB is not responding${NC}"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}❌ Redis is not responding${NC}"
fi

# Check Backend
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
fi

# Check Frontend
if curl -f http://localhost:${FRONTEND_PORT:-80}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend is not responding${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "📱 Access your Manga Viewer at:"
echo -e "${BLUE}   http://localhost:${FRONTEND_PORT:-80}${NC}"
echo ""
echo "📊 Service URLs:"
echo "   Frontend:  http://localhost:${FRONTEND_PORT:-80}"
echo "   Backend:   http://localhost:8080"
echo "   MongoDB:   mongodb://localhost:27017"
echo "   Redis:     redis://localhost:6379"
echo ""
echo "📝 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   Status:        docker-compose ps"
echo ""
