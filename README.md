# Manga Viewer - Rust Backend API

A high-performance REST API backend for the Manga Viewer application, built with Rust using Axum framework.

## 🚀 Features

- **Fast & Secure**: Built with Rust for memory safety and performance
- **REST API**: Full CRUD operations for manga library management
- **User Authentication**: JWT-based authentication system
- **Database**: PostgreSQL with migrations support
- **CORS**: Configured for cross-origin requests from frontend
- **Logging**: Structured logging with tracing
- **Error Handling**: Comprehensive error handling with proper HTTP status codes

## 🛠️ Technology Stack

- **Framework**: [Axum](https://github.com/tokio-rs/axum) - Modern async web framework
- **Database**: PostgreSQL with [SQLx](https://github.com/launchbadge/sqlx)
- **Authentication**: JWT tokens with [jsonwebtoken](https://github.com/Keats/jsonwebtoken)
- **Serialization**: [Serde](https://github.com/serde-rs/serde) for JSON handling
- **Async Runtime**: [Tokio](https://github.com/tokio-rs/tokio)
- **Environment**: [dotenv](https://github.com/dotenv-rs/dotenv) for configuration
- **CORS**: [tower-http](https://github.com/tower-rs/tower-http)

## 📋 Prerequisites

- **Rust** (latest stable version)
- **PostgreSQL** (version 12 or higher)
- **Cargo** (comes with Rust)

## 🔧 Installation & Setup

### 1. Clone and Navigate
```bash
cd server
```

### 2. Install Dependencies
```bash
cargo build
```

### 3. Database Setup
```bash
# Create a PostgreSQL database
createdb manga_viewer

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Environment Configuration
Create a `.env` file in the server directory:
```env
DATABASE_URL=postgresql://username:password@localhost/manga_viewer
JWT_SECRET=your-super-secret-jwt-key-here
SERVER_PORT=8080
CORS_ORIGIN=http://localhost:4200
```

### 5. Database Migrations
```bash
# Install sqlx-cli if not already installed
cargo install sqlx-cli

# Run migrations
sqlx migrate run
```

## 🚀 Running the Server

### Development Mode
```bash
cargo run
```

### Production Mode
```bash
cargo build --release
./target/release/manga-viewer-server
```

### With Hot Reload (using cargo-watch)
```bash
# Install cargo-watch
cargo install cargo-watch

# Run with hot reload
cargo watch -x run
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Library Management
- `GET /api/library` - Get user's manga library
- `POST /api/library` - Add manga to library
- `PUT /api/library/{id}` - Update manga entry
- `DELETE /api/library/{id}` - Remove manga from library

### Statistics
- `GET /api/library/stats` - Get reading statistics

### Health Check
- `GET /api/health` - Server health status

## 🧪 Testing

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_name
```

## 🐳 Docker Support

### Build Docker Image
```bash
docker build -t manga-viewer-api .
```

### Run with Docker
```bash
docker run -p 8080:8080 --env-file .env manga-viewer-api
```

### Docker Compose
```bash
# Start with PostgreSQL
docker-compose up -d
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Manga Library Table
```sql
CREATE TABLE manga_library (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    status VARCHAR(20) DEFAULT 'plan_to_read',
    current_chapter INTEGER DEFAULT 0,
    total_chapters INTEGER,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[],
    cover_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `SERVER_PORT` - Port to run the server (default: 8080)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:4200)
- `RUST_LOG` - Log level (debug, info, warn, error)

### Logging
Set log level using `RUST_LOG` environment variable:
```bash
RUST_LOG=debug cargo run
```

## 🚀 Deployment

### Build for Production
```bash
cargo build --release
```

### Deploy to Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Initialize fly app
fly launch

# Deploy
fly deploy
```

### Environment Variables for Production
```bash
fly secrets set DATABASE_URL="your-production-db-url"
fly secrets set JWT_SECRET="your-production-jwt-secret"
```

## 🔒 Security Features

- **Password Hashing**: bcrypt for secure password storage
- **JWT Authentication**: Stateless authentication with tokens
- **CORS Protection**: Configured CORS for frontend-only access
- **SQL Injection Prevention**: Parameterized queries with SQLx
- **Input Validation**: Request validation and sanitization

## 📈 Performance

- **Async/Await**: Non-blocking I/O with Tokio
- **Connection Pooling**: Database connection pooling with SQLx
- **Memory Efficient**: Rust's zero-cost abstractions
- **Fast JSON**: Optimized serialization with Serde

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
psql -l | grep manga_viewer
```

**Migration Errors**
```bash
# Reset migrations (development only)
sqlx migrate revert
sqlx migrate run
```

**Port Already in Use**
```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>
```

## 📚 Development

### Project Structure
```
server/
├── src/
│   ├── main.rs          # Application entry point
│   ├── config/          # Configuration modules
│   ├── handlers/        # Route handlers
│   ├── models/          # Data models
│   ├── middleware/      # Custom middleware
│   └── utils/           # Utility functions
├── migrations/          # Database migrations
├── Cargo.toml          # Dependencies
├── Dockerfile          # Docker configuration
└── README.md           # This file
```

### Adding New Endpoints
1. Define models in `src/models/`
2. Create handlers in `src/handlers/`
3. Add routes in `src/main.rs`
4. Add tests in respective modules

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the [API Documentation](docs/api.md)
- Review the [Troubleshooting Guide](docs/troubleshooting.md)
