# Docker Deployment Guide

Complete guide for deploying Manga Viewer using Docker Compose, optimized for NAS and home server deployments.

## Quick Start

```bash
# 1. Configure environment
cp .env.docker .env.docker.local
nano .env.docker.local  # Edit with your settings

# 2. Deploy
./deploy.sh

# 3. Access
# Open http://your-nas-ip in your browser
```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum (4GB recommended)
- 10GB disk space minimum

### Installing Docker on NAS

#### Synology NAS
1. Open Package Center
2. Search for "Docker"
3. Install Docker package
4. SSH into your NAS and install Docker Compose:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### QNAP NAS
1. Open App Center
2. Search for "Container Station"
3. Install Container Station
4. Docker Compose is included

#### TrueNAS/FreeNAS
1. Enable Docker service in System Settings
2. Install Docker Compose via shell:
```bash
pkg install docker-compose
```

## Configuration

### 1. Environment Setup

Copy the example environment file:
```bash
cp .env.docker .env.docker.local
```

Edit `.env.docker.local` with your settings:

```bash
# MongoDB Configuration
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your_secure_mongodb_password_here

# Redis Configuration  
REDIS_PASSWORD=your_secure_redis_password_here

# JWT Secret (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this

# Server Configuration
SERVER_PORT=8080
RUST_LOG=info  # Options: trace, debug, info, warn, error

# Frontend Configuration
FRONTEND_PORT=80  # Change if port 80 is in use
CORS_ORIGIN=http://your-nas-ip  # Update with your NAS IP

# OpenAI API Key (Optional - for AI features)
OPENAI_API_KEY=sk-your-openai-key-here

# Local Manga Storage Path
MANGA_STORAGE_PATH=./manga_storage

# Backup Configuration
BACKUP_PATH=./backups
```

### 2. Security Best Practices

1. **Change all default passwords** in `.env.docker.local`
2. **Generate a strong JWT secret**:
```bash
openssl rand -base64 32
```
3. **Use strong passwords** for MongoDB and Redis
4. **Restrict network access** using firewall rules
5. **Enable HTTPS** (see Reverse Proxy section)

### 3. Storage Configuration

#### Local Manga Files
If you want to import local manga files:

```bash
# Create storage directory
mkdir -p ./manga_storage

# Set permissions (if needed)
chmod 755 ./manga_storage
```

Mount your NAS shared folder:
```bash
# In docker-compose.yml, update the volume:
volumes:
  - /volume1/manga:/app/manga_storage  # Synology example
  - /share/manga:/app/manga_storage    # QNAP example
```

## Deployment

### Automated Deployment

Use the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Build the Angular frontend
2. Build Docker images
3. Start all services
4. Run health checks
5. Display access URLs

### Manual Deployment

```bash
# 1. Build frontend
npm install
npm run build

# 2. Build and start services
docker-compose build
docker-compose up -d

# 3. Check status
docker-compose ps
docker-compose logs -f
```

## Service Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Check Status
```bash
docker-compose ps
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
./deploy.sh
```

## Backup and Restore

### Automated Backup

```bash
chmod +x backup.sh
./backup.sh
```

Backups include:
- MongoDB database dump
- Local manga files (if configured)
- Backup metadata

Backups are stored in `./backups/` and automatically cleaned up after 7 days.

### Scheduled Backups

Add to crontab for daily backups at 2 AM:
```bash
crontab -e
# Add this line:
0 2 * * * cd /path/to/manga-viewer && ./backup.sh >> /var/log/manga-backup.log 2>&1
```

### Restore from Backup

```bash
chmod +x restore.sh
./restore.sh ./backups/manga-viewer-backup-YYYYMMDD_HHMMSS.tar.gz
```

## NAS-Specific Configuration

### Synology NAS

1. **Port Configuration**: If port 80 is used by DSM, change `FRONTEND_PORT`:
```bash
FRONTEND_PORT=8090
```

2. **Shared Folder**: Create a shared folder for manga storage:
```bash
# In docker-compose.yml:
volumes:
  - /volume1/manga:/app/manga_storage
```

3. **Auto-start**: Enable auto-start in Docker package settings

4. **Firewall**: Add rules in Control Panel > Security > Firewall

### QNAP NAS

1. **Container Station**: Deploy via Container Station UI or CLI

2. **Shared Folder**:
```bash
# In docker-compose.yml:
volumes:
  - /share/manga:/app/manga_storage
```

3. **Resource Limits**: Set in Container Station > Container > Settings

### TrueNAS

1. **Jail/VM**: Run Docker in a jail or VM

2. **Dataset**: Create a dataset for manga storage:
```bash
# In docker-compose.yml:
volumes:
  - /mnt/pool/manga:/app/manga_storage
```

## Reverse Proxy Setup

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name manga.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.manga.rule=Host(`manga.yourdomain.com`)"
  - "traefik.http.routers.manga.entrypoints=websecure"
  - "traefik.http.routers.manga.tls.certresolver=letsencrypt"
```

### Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:80
```

## Monitoring

### Health Checks

```bash
# Frontend
curl http://localhost/health

# Backend
curl http://localhost:8080/health

# MongoDB
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker-compose exec redis redis-cli ping
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Logs size
du -sh $(docker inspect --format='{{.LogPath}}' manga-viewer-backend)
```

## Troubleshooting

### Services Won't Start

1. **Check logs**:
```bash
docker-compose logs
```

2. **Check ports**:
```bash
netstat -tulpn | grep -E '80|8080|27017|6379'
```

3. **Check permissions**:
```bash
ls -la manga_storage
```

### Database Connection Issues

1. **Verify MongoDB is running**:
```bash
docker-compose ps mongodb
```

2. **Check MongoDB logs**:
```bash
docker-compose logs mongodb
```

3. **Test connection**:
```bash
docker-compose exec mongodb mongosh -u admin -p
```

### Frontend Not Loading

1. **Check if build exists**:
```bash
ls -la dist/frontend/browser
```

2. **Rebuild frontend**:
```bash
npm run build
docker-compose restart frontend
```

3. **Check nginx logs**:
```bash
docker-compose logs frontend
```

### Backend API Errors

1. **Check environment variables**:
```bash
docker-compose exec backend env | grep -E 'MONGODB|JWT|REDIS'
```

2. **Check backend logs**:
```bash
docker-compose logs backend
```

3. **Increase log level**:
```bash
# In .env.docker.local:
RUST_LOG=debug
docker-compose restart backend
```

### Out of Memory

1. **Check memory usage**:
```bash
docker stats
```

2. **Increase Docker memory limit** (Docker Desktop):
   - Settings > Resources > Memory

3. **Add swap space** (Linux):
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Disk Space Issues

1. **Clean up Docker**:
```bash
docker system prune -a
docker volume prune
```

2. **Check volume sizes**:
```bash
docker system df -v
```

3. **Move volumes** to larger disk:
```bash
docker-compose down
mv /var/lib/docker /mnt/larger-disk/docker
ln -s /mnt/larger-disk/docker /var/lib/docker
```

## Performance Optimization

### MongoDB Optimization

```bash
# In docker-compose.yml, add to mongodb service:
command: mongod --wiredTigerCacheSizeGB 1
```

### Redis Optimization

```bash
# In docker-compose.yml, add to redis service:
command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Nginx Caching

Already configured in `nginx.conf` with:
- Gzip compression
- Static asset caching (1 year)
- Browser cache headers

## Upgrading

### Application Updates

```bash
# 1. Backup first
./backup.sh

# 2. Pull latest code
git pull

# 3. Rebuild and restart
./deploy.sh
```

### Docker Image Updates

```bash
# Update base images
docker-compose pull

# Rebuild with new base images
docker-compose build --pull

# Restart services
docker-compose up -d
```

## Uninstalling

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker rmi $(docker images -q manga-viewer*)

# Remove project files
cd ..
rm -rf manga-viewer
```

## Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check README.md and other guides
- **Logs**: Always include logs when reporting issues

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT secret
- [ ] Configured firewall rules
- [ ] Set up HTTPS/reverse proxy
- [ ] Enabled automatic backups
- [ ] Restricted MongoDB/Redis access
- [ ] Updated CORS_ORIGIN to your domain
- [ ] Reviewed and secured .env.docker.local
- [ ] Set up monitoring/alerts
- [ ] Tested backup and restore process

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Nginx Documentation](https://nginx.org/en/docs/)
