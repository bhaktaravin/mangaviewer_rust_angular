#!/bin/bash

# Create Test User Script
# This script creates a test user in MongoDB for development/testing

MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017"}
DATABASE_NAME=${DATABASE_NAME:-"mangaviewer"}

echo "🔧 Creating test user in MongoDB..."
echo "Database: $MONGODB_URI/$DATABASE_NAME"
echo ""

# Generate bcrypt hash for password "testpass123"
# Hash generated with cost factor 12
BCRYPT_HASH='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIFn7Gs3e.'

# Create test user using mongosh
mongosh "$MONGODB_URI/$DATABASE_NAME" --quiet --eval "
db.users.deleteOne({ username: 'testuser' });

var result = db.users.insertOne({
  username: 'testuser',
  email: 'test@example.com',
  password: '$BCRYPT_HASH',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

if (result.acknowledged) {
  print('✅ Test user created successfully!');
  print('');
  print('Login credentials:');
  print('  Username: testuser');
  print('  Email: test@example.com');
  print('  Password: testpass123');
  print('');
  print('User ID: ' + result.insertedId);
} else {
  print('❌ Failed to create test user');
}
"

echo ""
echo "📚 Adding sample manga to test user's library..."

# Get the user ID
USER_ID=$(mongosh "$MONGODB_URI/$DATABASE_NAME" --quiet --eval "
var user = db.users.findOne({ username: 'testuser' });
if (user) { print(user._id); }
")

if [ -z "$USER_ID" ]; then
  echo "❌ Could not find test user"
  exit 1
fi

echo "User ID: $USER_ID"

# Add some sample manga to library
mongosh "$MONGODB_URI/$DATABASE_NAME" --quiet --eval "
// Sample manga for testing
var sampleManga = [
  {
    user_id: '$USER_ID',
    manga_id: 'a96676e5-8ae2-425e-b549-7f15dd34a6d8',
    manga_title: 'One Piece',
    status: 'Reading',
    reading_progress: [],
    added_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    user_id: '$USER_ID',
    manga_id: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
    manga_title: 'Attack on Titan',
    status: 'Completed',
    reading_progress: [],
    added_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    user_id: '$USER_ID',
    manga_id: 'd86cf65b-5f6c-437d-a0af-19a31f94ec55',
    manga_title: 'Demon Slayer',
    status: 'PlanToRead',
    reading_progress: [],
    added_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

db.library.deleteMany({ user_id: '$USER_ID' });
var result = db.library.insertMany(sampleManga);

if (result.acknowledged) {
  print('✅ Added ' + result.insertedIds.length + ' sample manga to library');
} else {
  print('❌ Failed to add sample manga');
}
"

echo ""
echo "✅ Test user setup complete!"
echo ""
echo "You can now log in with:"
echo "  Username: testuser"
echo "  Password: testpass123"
echo ""
