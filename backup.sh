#!/bin/bash

# Manga Viewer Backup Script
# Backs up MongoDB data and user uploads

set -e

echo "💾 Starting Manga Viewer Backup..."

# Load environment variables
if [ -f .env.docker ]; then
    export $(cat .env.docker | grep -v '^#' | xargs)
fi

# Create backup directory
BACKUP_DIR="${BACKUP_PATH:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="manga-viewer-backup-${TIMESTAMP}"
BACKUP_FULL_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

mkdir -p "${BACKUP_FULL_PATH}"

echo "📁 Backup location: ${BACKUP_FULL_PATH}"

# Backup MongoDB
echo "🗄️  Backing up MongoDB..."
docker-compose exec -T mongodb mongodump \
    --username="${MONGO_ROOT_USER:-admin}" \
    --password="${MONGO_ROOT_PASSWORD:-changeme}" \
    --authenticationDatabase=admin \
    --db="${DATABASE_NAME:-mangaviewer}" \
    --archive > "${BACKUP_FULL_PATH}/mongodb.archive"

echo "✅ MongoDB backup complete"

# Backup manga storage (if exists)
if [ -d "${MANGA_STORAGE_PATH:-./manga_storage}" ]; then
    echo "📚 Backing up manga storage..."
    tar -czf "${BACKUP_FULL_PATH}/manga_storage.tar.gz" \
        -C "$(dirname ${MANGA_STORAGE_PATH:-./manga_storage})" \
        "$(basename ${MANGA_STORAGE_PATH:-./manga_storage})"
    echo "✅ Manga storage backup complete"
fi

# Create backup info file
cat > "${BACKUP_FULL_PATH}/backup_info.txt" << EOF
Manga Viewer Backup
===================
Date: $(date)
Database: ${DATABASE_NAME:-mangaviewer}
Version: $(git describe --tags --always 2>/dev/null || echo "unknown")

Contents:
- mongodb.archive: MongoDB database dump
- manga_storage.tar.gz: Local manga files (if applicable)

Restore Instructions:
1. Stop the application: docker-compose down
2. Restore MongoDB: cat mongodb.archive | docker-compose exec -T mongodb mongorestore --archive
3. Restore files: tar -xzf manga_storage.tar.gz
4. Start application: docker-compose up -d
EOF

# Compress entire backup
echo "🗜️  Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

echo ""
echo "✅ Backup complete!"
echo "📦 Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""

# Clean up old backups (keep last 7 days)
echo "🧹 Cleaning up old backups (keeping last 7 days)..."
find "${BACKUP_DIR}" -name "manga-viewer-backup-*.tar.gz" -mtime +7 -delete
echo "✅ Cleanup complete"

# Show backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
echo ""
echo "📊 Backup size: ${BACKUP_SIZE}"
echo "💾 Total backups: $(ls -1 ${BACKUP_DIR}/manga-viewer-backup-*.tar.gz 2>/dev/null | wc -l)"
