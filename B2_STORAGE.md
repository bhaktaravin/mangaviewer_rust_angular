# Backblaze B2 Storage Integration

## Overview

The Manga Viewer now supports Backblaze B2 cloud storage for persistent manga chapter image storage and delivery. This provides:

- **Cost-effective storage** (~$5/TB/month, first 10GB free)
- **Fast global CDN delivery** via Backblaze's network
- **Persistent caching** of manga chapters
- **Reduced MangaDex API load** by serving from your own storage
- **S3-compatible API** for easy integration

## Features

### 1. Automatic Chapter Upload
- Download chapters from MangaDex
- Automatically upload to B2 storage
- Generate public URLs for serving

### 2. Smart Caching
- Check if chapter exists in B2 before downloading
- Serve from B2 if available (fast)
- Fallback to MangaDex if not cached

### 3. Organized Storage Structure
```
manga/
├── {manga_id}/
│   ├── chapter-1/
│   │   ├── page-001.jpg
│   │   ├── page-002.jpg
│   │   └── page-003.jpg
│   ├── chapter-2/
│   │   ├── page-001.jpg
│   │   └── ...
│   └── ...
```

## Setup

### Step 1: Create Backblaze B2 Account

1. Go to [backblaze.com/b2](https://www.backblaze.com/b2/cloud-storage.html)
2. Sign up for a free account (10GB free storage)
3. Create a new bucket:
   - Bucket Name: `manga-viewer` (or your choice)
   - Files in Bucket: **Public**
   - Encryption: Disabled (for public serving)

### Step 2: Create Application Key

1. Go to **App Keys** in B2 dashboard
2. Click **Add a New Application Key**
3. Settings:
   - Key Name: `manga-viewer-key`
   - Allow access to Bucket: `manga-viewer` (your bucket)
   - Type of Access: **Read and Write**
   - Allow List All Bucket Names: Yes
4. **Save the credentials** (shown only once):
   - `keyID` → This is your `B2_ACCESS_KEY_ID`
   - `applicationKey` → This is your `B2_SECRET_ACCESS_KEY`

### Step 3: Get Bucket Information

1. Go to **Buckets** in B2 dashboard
2. Click on your bucket
3. Note the **Endpoint** (e.g., `s3.us-west-004.backblazeb2.com`)
4. Note the **Friendly URL** (e.g., `https://f004.backblazeb2.com/file/manga-viewer`)

### Step 4: Configure Environment Variables

Add to your `.env.docker` file:

```bash
# Backblaze B2 Storage Configuration
B2_ENDPOINT=s3.us-west-004.backblazeb2.com
B2_REGION=us-west-004
B2_ACCESS_KEY_ID=your_key_id_here
B2_SECRET_ACCESS_KEY=your_application_key_here
B2_BUCKET_NAME=manga-viewer
B2_PUBLIC_URL=https://f004.backblazeb2.com/file/manga-viewer
```

**Important:** Replace the values with your actual B2 credentials!

### Step 5: Deploy

```bash
# Rebuild and restart
./deploy.sh

# Or manually
docker-compose down
docker-compose up -d --build
```

Check logs to confirm B2 is initialized:
```bash
docker-compose logs backend | grep -i b2
# Should see: ✅ Backblaze B2 storage initialized
```

## API Endpoints

### 1. Upload Chapter to B2

**POST** `/api/b2/upload`

Upload a chapter from MangaDex to B2 storage.

**Query Parameters:**
- `manga_id` (required): Manga identifier
- `chapter_id` (required): MangaDex chapter ID
- `chapter_number` (required): Chapter number (e.g., "1", "2.5")

**Example:**
```bash
curl -X POST "http://localhost:8080/api/b2/upload?manga_id=naruto&chapter_id=abc123&chapter_number=1"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully uploaded 20 pages",
  "page_count": 20,
  "urls": [
    "https://f004.backblazeb2.com/file/manga-viewer/manga/naruto/chapter-1/page-001.jpg",
    "https://f004.backblazeb2.com/file/manga-viewer/manga/naruto/chapter-1/page-002.jpg",
    ...
  ]
}
```

### 2. Get Chapter URLs

**GET** `/api/b2/chapter`

Get URLs for a chapter (if cached in B2).

**Query Parameters:**
- `manga_id` (required): Manga identifier
- `chapter_number` (required): Chapter number
- `page_count` (optional): Expected page count (default: 50)

**Example:**
```bash
curl "http://localhost:8080/api/b2/chapter?manga_id=naruto&chapter_number=1"
```

**Response (if cached):**
```json
{
  "success": true,
  "manga_id": "naruto",
  "chapter_number": "1",
  "page_count": 20,
  "cached": true,
  "urls": [...]
}
```

**Response (if not cached):**
```json
{
  "error": "Chapter not found in storage",
  "message": "Use /api/b2/upload to cache this chapter first"
}
```

### 3. Check if Chapter Exists

**GET** `/api/b2/exists/:manga_id/:chapter_number`

Check if a chapter is cached in B2.

**Example:**
```bash
curl "http://localhost:8080/api/b2/exists/naruto/1"
```

**Response:**
```json
{
  "exists": true,
  "manga_id": "naruto",
  "chapter_number": "1"
}
```

### 4. B2 Storage Stats

**GET** `/api/b2/stats`

Get B2 storage configuration info.

**Example:**
```bash
curl "http://localhost:8080/api/b2/stats"
```

**Response:**
```json
{
  "enabled": true,
  "bucket_name": "manga-viewer",
  "endpoint": "s3.us-west-004.backblazeb2.com"
}
```

## Usage Workflow

### Automatic Caching Workflow

1. **User opens a chapter** in the reader
2. **Frontend checks** if chapter exists in B2: `GET /api/b2/exists/manga_id/chapter_num`
3. **If exists**: Serve images directly from B2 URLs (fast!)
4. **If not exists**: 
   - Upload to B2: `POST /api/b2/upload?...`
   - Then serve from B2 for future requests

### Manual Pre-caching

Pre-cache popular manga chapters:

```bash
# Cache first 10 chapters of Naruto
for i in {1..10}; do
  curl -X POST "http://localhost:8080/api/b2/upload?manga_id=naruto&chapter_id=CHAPTER_ID&chapter_number=$i"
done
```

## Frontend Integration

### Update Manga Reader Component

```typescript
// In manga-reader.component.ts

async loadChapter(mangaId: string, chapterNumber: string, chapterId: string) {
  // Check if chapter is cached in B2
  const existsResponse = await this.http.get(
    `/api/b2/exists/${mangaId}/${chapterNumber}`
  ).toPromise();

  if (existsResponse.exists) {
    // Get URLs from B2
    const urlsResponse = await this.http.get(
      `/api/b2/chapter?manga_id=${mangaId}&chapter_number=${chapterNumber}`
    ).toPromise();
    
    this.pages = urlsResponse.urls;
    this.loadingFromB2 = true;
  } else {
    // Upload to B2 in background
    this.http.post(
      `/api/b2/upload?manga_id=${mangaId}&chapter_id=${chapterId}&chapter_number=${chapterNumber}`,
      {}
    ).subscribe(
      response => {
        console.log('Chapter cached to B2:', response);
        // Optionally reload from B2 URLs
        this.pages = response.urls;
      },
      error => {
        console.warn('Failed to cache to B2, using MangaDex:', error);
        // Fallback to MangaDex
        this.loadFromMangaDex(chapterId);
      }
    );
    
    // Load from MangaDex immediately
    this.loadFromMangaDex(chapterId);
  }
}
```

## Cost Estimation

### Backblaze B2 Pricing (as of 2024)

- **Storage**: $0.005/GB/month ($5/TB/month)
- **Download**: $0.01/GB (first 3x storage is free)
- **API Calls**: Free (Class B: 2,500/day free, Class C: 2,500/day free)

### Example Costs

**Scenario 1: Small Library (100 chapters, 20 pages each)**
- Storage: 100 chapters × 20 pages × 500KB = 1GB
- Cost: $0.005/month + free downloads = **~$0.01/month**

**Scenario 2: Medium Library (1,000 chapters)**
- Storage: 1,000 chapters × 20 pages × 500KB = 10GB
- Cost: $0.05/month + free downloads = **~$0.05/month**

**Scenario 3: Large Library (10,000 chapters)**
- Storage: 10,000 chapters × 20 pages × 500KB = 100GB
- Cost: $0.50/month + downloads = **~$1-2/month**

**Much cheaper than hosting on your NAS!** (electricity, hardware wear)

## Performance Benefits

### Before B2 Integration
- Every chapter load: Download from MangaDex (~500-2000ms per page)
- Bandwidth: Limited by MangaDex rate limits
- Availability: Dependent on MangaDex uptime

### After B2 Integration
- Cached chapters: Serve from B2 (~50-200ms per page)
- Bandwidth: Unlimited (within B2 limits)
- Availability: 99.9% uptime SLA from Backblaze
- **5-10x faster** page loading for cached chapters

## Monitoring

### Check B2 Usage

```bash
# Check storage stats
curl http://localhost:8080/api/b2/stats

# Check if specific chapters are cached
curl http://localhost:8080/api/b2/exists/naruto/1
curl http://localhost:8080/api/b2/exists/onepiece/100
```

### View B2 Dashboard

1. Log into [backblaze.com](https://www.backblaze.com)
2. Go to **Buckets** → Your bucket
3. View:
   - Total storage used
   - Bandwidth used
   - File count
   - Recent uploads

### Application Logs

```bash
# View B2-related logs
docker-compose logs backend | grep -i b2

# Watch uploads in real-time
docker-compose logs -f backend | grep "Uploaded to B2"
```

## Troubleshooting

### B2 Not Initializing

**Error:** `ℹ️  Backblaze B2 not configured`

**Solution:**
1. Check environment variables are set:
```bash
docker-compose exec backend env | grep B2_
```

2. Verify credentials are correct in `.env.docker`
3. Restart backend:
```bash
docker-compose restart backend
```

### Upload Failures

**Error:** `Failed to upload to B2`

**Possible causes:**
1. **Invalid credentials** - Check keyID and applicationKey
2. **Bucket permissions** - Ensure key has write access
3. **Bucket is private** - Make bucket public for serving
4. **Network issues** - Check firewall/proxy settings

**Debug:**
```bash
# Test B2 connection
docker-compose exec backend curl -v https://s3.us-west-004.backblazeb2.com
```

### Images Not Loading

**Error:** Images return 403 or 404

**Solution:**
1. **Make bucket public:**
   - B2 Dashboard → Buckets → Your bucket
   - Bucket Settings → Files in Bucket: **Public**

2. **Check public URL format:**
   - Should be: `https://f004.backblazeb2.com/file/bucket-name/path`
   - Not: `https://s3.us-west-004.backblazeb2.com/...`

3. **Verify file exists:**
```bash
curl -I "https://f004.backblazeb2.com/file/manga-viewer/manga/test/chapter-1/page-001.jpg"
```

### High Costs

**Issue:** B2 costs higher than expected

**Solutions:**
1. **Enable download caps** in B2 dashboard
2. **Use Cloudflare CDN** (free bandwidth):
   - Add Cloudflare in front of B2
   - Bandwidth Alliance = free egress
3. **Implement image compression:**
   - Convert to WebP format (50-80% smaller)
   - Reduce quality for older chapters
4. **Set lifecycle rules:**
   - Auto-delete chapters older than X days
   - Keep only popular manga cached

## Advanced Features

### 1. Cloudflare CDN Integration

Add Cloudflare in front of B2 for free bandwidth:

1. Add domain to Cloudflare
2. Create CNAME: `cdn.yourdomain.com` → `f004.backblazeb2.com`
3. Update `B2_PUBLIC_URL`:
```bash
B2_PUBLIC_URL=https://cdn.yourdomain.com/file/manga-viewer
```

**Benefits:**
- Free bandwidth (Bandwidth Alliance)
- Global CDN caching
- DDoS protection
- SSL/TLS included

### 2. Image Optimization

Convert images to WebP before uploading:

```rust
// Add to b2_storage.rs
use image::ImageFormat;

pub async fn upload_optimized_image(
    &self,
    key: &str,
    data: Bytes,
) -> Result<String, Box<dyn std::error::Error>> {
    // Convert to WebP
    let img = image::load_from_memory(&data)?;
    let mut webp_data = Vec::new();
    img.write_to(&mut webp_data, ImageFormat::WebP)?;
    
    // Upload WebP version
    self.upload_image(key, Bytes::from(webp_data), "image/webp").await
}
```

### 3. Automatic Cleanup

Delete old chapters to save costs:

```rust
// Add cleanup job
pub async fn cleanup_old_chapters(&self, days: u64) -> Result<(), Box<dyn std::error::Error>> {
    // List objects older than X days
    // Delete them
    Ok(())
}
```

## Security Best Practices

1. **Use Application Keys** (not Master Key)
2. **Limit key permissions** to specific bucket
3. **Rotate keys regularly** (every 90 days)
4. **Enable bucket encryption** for sensitive content
5. **Use HTTPS only** for serving images
6. **Set CORS headers** appropriately
7. **Monitor access logs** for suspicious activity

## Summary

Backblaze B2 integration provides:
- ✅ Cost-effective storage ($5/TB/month)
- ✅ Fast global CDN delivery
- ✅ Persistent chapter caching
- ✅ Reduced MangaDex API dependency
- ✅ 5-10x faster page loading
- ✅ 99.9% uptime SLA
- ✅ S3-compatible API
- ✅ Easy Cloudflare integration

Perfect for self-hosting manga on your NAS with cloud backup and CDN delivery!
