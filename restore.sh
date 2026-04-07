#!/bin/bash

# Manga Viewer Restore Script
# Restores MongoDB data and user uploads from backup

set -e

echo "♻️  Starting Manga Viewer Restore..."

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Error: No backup file specified"
    echo "Usage: ./restore.sh <backup-file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -1 ./backups/manga-viewer-backup-*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Load environment variables
if [ -f .env.docker ]; then
    export $(cat .env.docker | grep -v '^#' | xargs)
fi

echo "📦 Backup file: ${BACKUP_FILE}"
echo ""
read -p "⚠️  This will overwrite existing data. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# Extract backup
TEMP_DIR=$(mktemp -d)
echo "📂 Extracting backup to ${TEMP_DIR}..."
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the backup directory
BACKUP_DIR=$(find "${TEMP_DIR}" -maxdepth 1 -type d -name "manga-viewer-backup-*" | head -n 1)

if [ -z "${BACKUP_DIR}" ]; then
    echo "❌ Error: Invalid backup file structure"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

echo "✅ Backup extracted"

# Stop services
echo "🛑 Stopping services..."
docker-compose down

# Restore MongoDB
if [ -f "${BACKUP_DIR}/mongodb.archive" ]; then
    echo "🗄️  Restoring MongoDB..."
    
    # Start only MongoDB
    docker-compose up -d mongodb
    sleep 5
    
    # Restore database
    cat "${BACKUP_DIR}/mongodb.archive" | docker-compose exec -T mongodb mongorestore \
        --username="${MONGO_ROOT_USER:-admin}" \
        --password="${MONGO_ROOT_PASSWORD:-changeme}" \
        --authenticationDatabase=admin \
        --archive \
        --drop
    
    echo "✅ MongoDB restored"
else
    echo "⚠️  Warning: MongoDB backup not found in archive"
fi

# Restore manga storage
if [ -f "${BACKUP_DIR}/manga_storage.tar.gz" ]; then
    echo "📚 Restoring manga storage..."
    tar -xzf "${BACKUP_DIR}/manga_storage.tar.gz" -C .
    echo "✅ Manga storage restored"
else
    echo "ℹ️  No manga storage backup found (this is normal if you don't use local files)"
fi

# Clean up temp directory
rm -rf "${TEMP_DIR}"

# Start all services
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "✅ Restore complete!"
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo "📱 Your Manga Viewer should be available at:"
echo "   http://localhost:${FRONTEND_PORT:-80}"
echo ""
