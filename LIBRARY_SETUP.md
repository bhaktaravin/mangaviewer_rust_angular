# Quick Start Guide - Library & Test User

## 🚀 Creating a Test User

Run the script to create a test user with sample manga:

```bash
./create_test_user.sh
```

This will create:
- **Username:** `testuser`
- **Email:** `test@example.com`
- **Password:** `testpass123`
- **Sample manga:** One Piece, Attack on Titan, Demon Slayer (with different reading statuses)

## 📚 New Library Page

The library page is now available at `/library` and includes:

### Features
- **Reading Statistics Dashboard**
  - Total manga in library
  - Currently reading count
  - Completed manga count
  - Total chapters read
  - Status-based counters

- **Filters & Search**
  - Filter by reading status (All, Reading, Completed, Plan to Read, On Hold, Dropped)
  - Search by manga title
  - Status badges with icons

- **Manga Cards**
  - Cover images (or placeholder)
  - Progress bars showing completion %
  - Quick status updates
  - Continue Reading button (remembers last page)
  - Remove from library option

### Navigation
The library page is now in the navbar:
- **Authenticated users:** See "Library" link in navbar
- **Guest users:** Redirected to login
- **Auth guard:** Protects the route from unauthorized access

## 🎨 Updated Profile Page

The profile page now shows:
- User information (username, email, ID)
- **Live reading statistics** from your library
- Quick link to view full library
- Edit profile button (placeholder)
- Logout button

### Statistics Shown
- 📖 Total Manga
- 📗 Currently Reading
- ✅ Completed
- 📄 Chapters Read
- 📋 Plan to Read
- ⏸️ On Hold

## 🧪 Testing the Features

### 1. Start the Backend
```bash
# Make sure MongoDB is running
cargo run
```

### 2. Create Test User
```bash
./create_test_user.sh
```

### 3. Start Frontend
```bash
npm start
```

### 4. Test the Flow
1. Navigate to `http://localhost:4200/login`
2. Login with:
   - Username: `testuser`
   - Password: `testpass123`
3. Click "Library" in navbar
4. See sample manga with different statuses
5. Try filtering by status
6. Search for a manga
7. Click "Continue Reading" or "View Details"
8. Update manga status using dropdown
9. Check your profile page to see stats update

## 🔌 API Endpoints Used

The library page uses these endpoints:

```typescript
// Get user's library
GET /api/progress/library?user_id={userId}&status={optional}

// Get reading statistics
GET /api/progress/stats?user_id={userId}

// Add to library (not yet wired up in UI)
POST /api/progress/library/add
{
  "user_id": "...",
  "manga_id": "...",
  "title": "...",
  "status": "Reading"
}

// Update progress (not yet wired up in UI)
POST /api/progress/update
{
  "user_id": "...",
  "manga_id": "...",
  "chapter_id": "...",
  "current_page": 5,
  "total_pages": 20
}
```

## 📝 TODO: Next Steps

### High Priority
1. **Wire up "Add to Library" button** on manga detail pages
2. **Implement progress tracking** when viewing chapters
3. **Add "Remove from library" API call** (currently only frontend)
4. **Update status API call** (currently only frontend)

### Medium Priority
5. Add manga cover images (fetch from MangaDex API)
6. Implement "Continue Reading" chapter navigation
7. Add pagination to library (currently loads all)
8. Add sorting options (by title, date added, last read)

### Low Priority
9. Add favorites/bookmarks
10. Add reading goals
11. Export/import reading list
12. Share library with friends

## 🎨 Component Files

New files created:
- `src/app/library/library.component.ts` - Main component logic
- `src/app/library/library.component.html` - Template
- `src/app/library/library.component.css` - Styles
- `create_test_user.sh` - Test user creation script

Updated files:
- `src/app/app.routes.ts` - Added library route with auth guard
- `src/app/profile/profile.ts` - Added reading stats
- `src/app/profile/profile.html` - Display stats
- `src/app/profile/profile.css` - Stats styling
- `src/app/auth.service.ts` - Added getUserId() method

## 🐛 Known Issues

1. **No cover images yet** - Using placeholders, need to fetch from MangaDex API
2. **Continue Reading not wired up** - Placeholder navigation, need chapter viewer
3. **Remove from library** - Frontend only, no API call yet
4. **Update status** - Frontend only, no API call yet
5. **No pagination** - Loads all manga at once (might be slow for large libraries)

## 💡 Tips

- The test user script is idempotent - you can run it multiple times
- Sample manga IDs are real MangaDex IDs (you can fetch their data)
- The library page is fully responsive (mobile-friendly)
- All filters work in real-time
- Progress bars are calculated from reading_progress array

---

**Created:** January 2026  
**Status:** ✅ Ready for testing  
**Next:** Wire up remaining API calls and add chapter navigation
