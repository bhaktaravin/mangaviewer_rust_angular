# Quick Deployment Guide

## For NAS/Home Server Deployment

Your Manga Viewer is now ready for Docker deployment on your NAS!

### What's Included

1. **docker-compose.yml** - Complete multi-service setup
   - MongoDB database
   - Redis cache
   - Rust backend API
   - Nginx frontend server

2. **Deployment Scripts**
   - `deploy.sh` - One-command deployment
   - `backup.sh` - Automated backups
   - `restore.sh` - Easy restoration

3. **Configuration**
   - `.env.docker` - Environment template
   - `nginx.conf` - Optimized web server config
   - `.dockerignore` - Efficient builds

4. **Documentation**
   - `DOCKER_DEPLOYMENT.md` - Complete deployment guide

### Quick Start (3 Steps)

```bash
# 1. Configure
cp .env.docker .env.docker.local
nano .env.docker.local  # Update passwords and settings

# 2. Deploy
./deploy.sh

# 3. Access
# Open http://your-nas-ip in browser
```

### Important: Before Deploying

1. **Change all passwords** in `.env.docker.local`:
   - MongoDB password
   - Redis password
   - JWT secret (generate with: `openssl rand -base64 32`)

2. **Update CORS_ORIGIN** to your NAS IP address

3. **Choose a port** if 80 is already in use (set FRONTEND_PORT)

### NAS-Specific Notes

#### Synology
- Port 80 may be used by DSM - use port 8090 instead
- Mount shared folder: `/volume1/manga:/app/manga_storage`

#### QNAP
- Use Container Station or CLI
- Mount shared folder: `/share/manga:/app/manga_storage`

#### TrueNAS
- Run in jail or VM
- Mount dataset: `/mnt/pool/manga:/app/manga_storage`

### Daily Operations

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Backup data
./backup.sh

# Update application
git pull && ./deploy.sh
```

### Need Help?

See `DOCKER_DEPLOYMENT.md` for:
- Detailed setup instructions
- Troubleshooting guide
- Security best practices
- Performance optimization
- Backup/restore procedures

### Features Deployed

✅ Bookmarks with notes and keyboard shortcuts
✅ Reading history tracking
✅ Continue reading section
✅ Advanced search with 13 genre filters
✅ Favorites system
✅ Professional UI with animations
✅ Progressive image loading
✅ Skeleton loaders and empty states
✅ Docker deployment ready

Enjoy your self-hosted Manga Viewer! 📚
