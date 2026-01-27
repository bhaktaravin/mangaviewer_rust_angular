# 🔐 Authentication System Documentation

## Overview

The authentication system uses **MongoDB** to store and verify user credentials in the `users` collection. It implements secure JWT-based authentication with bcrypt password hashing.

## ✅ How It Works

### 1. **User Registration** (`POST /api/auth/register`)

When a user registers:
1. ✅ Checks MongoDB `users` collection for existing username/email
2. ✅ Hashes password using bcrypt (cost factor 12)
3. ✅ Creates user document with profile and reading stats
4. ✅ Inserts into MongoDB `users` collection
5. ✅ Returns JWT token for immediate login

**MongoDB Query:**
```javascript
db.users.findOne({
  $or: [
    { username: "username" },
    { email: "email@example.com" }
  ]
})
```

### 2. **User Login** (`POST /api/auth/login`)

When a user logs in:
1. ✅ Queries MongoDB `users` collection by username
2. ✅ Verifies account is active (`is_active: true`)
3. ✅ Compares password with bcrypt hash
4. ✅ Generates JWT token (24-hour expiry)
5. ✅ Returns user data and token

**MongoDB Query:**
```javascript
db.users.findOne({ username: "username" })
```

### 3. **Token Verification**

JWT tokens contain:
- User ID
- Username
- Email
- Expiration timestamp (24 hours)

Protected endpoints validate the token and check if user exists in MongoDB.

## 📊 MongoDB Users Collection Structure

```json
{
  "_id": ObjectId("..."),
  "user_id": "uuid-v4-string",
  "username": "unique_username",
  "email": "unique_email@example.com",
  "password_hash": "$2b$12$...",
  "created_at": "2026-01-26T...",
  "updated_at": "2026-01-26T...",
  "is_admin": false,
  "is_active": true,
  "profile": {
    "display_name": "Display Name",
    "bio": null,
    "avatar_url": null,
    "favorite_genres": [],
    "reading_preferences": {
      "preferred_language": "en",
      "mature_content": false,
      "notifications_enabled": true
    }
  },
  "reading_stats": {
    "total_manga_read": 0,
    "total_chapters_read": 0,
    "reading_streak_days": 0,
    "favorite_manga_ids": [],
    "currently_reading": [],
    "completed": [],
    "plan_to_read": []
  }
}
```

## 🗄️ Database Indexes

For optimal performance, the following indexes are automatically created:

1. **username** (unique) - Fast username lookup during login
2. **email** (unique) - Prevent duplicate emails
3. **user_id** (unique) - Fast user lookup by ID
4. **is_admin + is_active** (compound) - Admin queries
5. **created_at** (descending) - User listing/sorting

## 🔧 Configuration

Set these environment variables in `.env`:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=mangaviewer
JWT_SECRET=your-secret-key-min-32-characters

# Optional (have defaults)
AUTH_DATABASE_NAME=manga_auth
MANGA_DATABASE_NAME=manga
```

## 🚀 API Endpoints

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "display_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    ...
  },
  "token": "eyJhbGci...",
  "message": "Registration successful"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "token": "eyJhbGci...",
  "message": "Login successful"
}
```

### Get Profile (Protected)
```bash
GET /api/auth/profile
Authorization: Bearer <token>
```

## 🧪 Testing

Run the authentication test script:

```bash
./test_auth.sh
```

This will:
- ✅ Register a new user
- ✅ Login with credentials
- ✅ Verify token works
- ✅ Test wrong password rejection

## 🔒 Security Features

1. **Password Hashing**: bcrypt with cost factor 12
2. **Unique Constraints**: Username and email must be unique
3. **JWT Tokens**: 24-hour expiration
4. **Account Status**: Can deactivate users (`is_active`)
5. **SQL Injection Protection**: MongoDB BSON prevents injection
6. **Input Validation**: Available via validation module

## 📝 Debugging

The system includes extensive logging:

```bash
# Enable debug logging
RUST_LOG=debug cargo run
```

Logs include:
- 🔗 MongoDB connection status
- 🔍 User lookup queries
- ✅ Successful registrations/logins
- ❌ Authentication failures
- 📊 Database user counts

## 🔍 Verify MongoDB Users

Connect to MongoDB and check:

```bash
# MongoDB Shell
mongosh mongodb://localhost:27017

use mangaviewer
db.users.find().pretty()
db.users.countDocuments()
```

## 📊 Admin Features

Admins can:
- List all users (with pagination)
- Activate/deactivate accounts
- Promote users to admin
- Delete users

See [src/auth_mongodb.rs](src/auth_mongodb.rs) for implementation details.

---

**The authentication system is fully functional and properly checking the MongoDB 'users' collection!** 🎉
