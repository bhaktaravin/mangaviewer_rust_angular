# Manga Viewer - Fullstack Application

This project is a modern, fullstack manga library management and reading application, featuring a Rust backend (Axum) and Angular 20 frontend. It includes AI-powered semantic search, persistent embeddings, and a beautiful, responsive UI.

## 🌟 Frontend Features (Angular)

- **📚 Manga Library Management**: Add, edit, delete, and organize your manga collection
- **🌙☀️ Dark/Light Theme Toggle**: Seamless theme switching with CSS variables
- **👤 User Authentication**: Secure login/register with JWT tokens
- **🧪 Guest Mode**: Full demo functionality without registration
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **🔍 Advanced Search & Filtering**: Find manga by title, author, status, or tags
- **📊 Reading Statistics**: Track your reading progress and statistics
- **⭐ Rating System**: Rate your manga with 1-5 star system
- **🏷️ Status Tracking**: Plan to Read, Reading, On Hold, Completed, Dropped
- **💫 Modern UI**: Beautiful gradients, animations, and hover effects

## 🛠️ Technology Stack

- **Frontend**: [Angular 20](https://angular.dev/) with standalone components
- **Styling**: CSS3 with CSS Variables for theming
- **State Management**: Angular Signals for reactive state
- **Backend**: Rust (Axum), MongoDB, Ollama (local embeddings)
- **API**: RESTful endpoints for all features
- **Build Tool**: Angular CLI with Vite

## 🚀 Backend Features (Rust)

- **Fast & Secure**: Built with Rust for memory safety and performance
- **REST API**: Full CRUD operations for manga library management
- **User Authentication**: JWT-based authentication system
- **Database**: MongoDB for persistent storage
- **AI Embeddings**: Local embedding generation with Ollama
- **Semantic Search**: Vector search for manga
- **CORS**: Configured for cross-origin requests from frontend
- **Logging**: Structured logging with tracing
- **Error Handling**: Comprehensive error handling with proper HTTP status codes

## 📋 Prerequisites

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Angular CLI** (optional, but recommended)
- **Rust** (latest stable version)
- **MongoDB** (local or cloud)
- **Ollama** (for local embeddings)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd mangaviewer_rust_angular
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Start Frontend
```bash
ng serve
```
Navigate to `http://localhost:4200/` in your browser.

### 4. Start Backend (Rust)
```bash
cargo run
```

### 5. Configure Environment
Create `.env` files for both frontend and backend as needed. See sample files in the repo.

## 🧠 AI Features

- **Semantic Search**: Uses Ollama for local embedding generation and MongoDB for persistent storage. Search results are ranked by cosine similarity.
- **Admin Endpoint**: Refresh embeddings for all manga in the database.

## 📡 API Endpoints (Backend)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/manga/search` - Search manga by text
- `POST /api/manga/semantic-search` - Semantic search with embeddings
- `POST /api/manga/update-embeddings` - Refresh all manga embeddings
- `GET /api/library` - Get user's manga library
- `POST /api/library` - Add manga to library
- `PUT /api/library/{id}` - Update manga entry
- `DELETE /api/library/{id}` - Remove manga from library
- `GET /api/library/stats` - Get reading statistics
- `GET /api/health` - Server health status

## 🐳 Docker Support

### Build Docker Image
```bash
docker build -t manga-viewer-api .
```

### Run with Docker
```bash
docker run -p 8080:8080 --env-file .env manga-viewer-api
```

## 📱 Application Structure

```
src/
├── app/
│   ├── home/           # Landing page
│   ├── login/          # Authentication
│   ├── register/       # User registration
│   ├── library/        # Main library interface
│   ├── navbar/         # Navigation component
│   ├── services/       # Angular services
│   ├── interfaces/     # TypeScript interfaces
│   └── guards/         # Route protection
├── assets/             # Static assets
└── styles.css          # Global styles & CSS variables
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔗 Links

- **Live Demo**: [Your Vercel URL]
- **Backend API**: [Your Fly.io URL]
- **GitHub Repository**: [Your GitHub URL]
- **Angular Documentation**: https://angular.dev/

Built with ❤️ using Rust, Angular 20, and modern web technologies.
<<<<<<< HEAD
# Manga Viewer - Frontend Application

A modern, responsive manga library management application built with Angular 20. Features a beautiful dark/light theme system, comprehensive library management, and seamless user experience.

## 🌟 Features

- **📚 Manga Library Management**: Add, edit, delete, and organize your manga collection
- **🌙☀️ Dark/Light Theme Toggle**: Seamless theme switching with CSS variables
- **👤 User Authentication**: Secure login/register with JWT tokens
- **🧪 Guest Mode**: Full demo functionality without registration
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **🔍 Advanced Search & Filtering**: Find manga by title, author, status, or tags
- **📊 Reading Statistics**: Track your reading progress and statistics
- **⭐ Rating System**: Rate your manga with 1-5 star system
- **🏷️ Status Tracking**: Plan to Read, Reading, On Hold, Completed, Dropped
- **💫 Modern UI**: Beautiful gradients, animations, and hover effects

## 🛠️ Technology Stack

- **Framework**: [Angular 20](https://angular.dev/) with standalone components
- **Styling**: CSS3 with CSS Variables for theming
- **State Management**: Angular Signals for reactive state
- **HTTP Client**: Angular HttpClient for API communication
- **Routing**: Angular Router with guards
- **Forms**: Angular Reactive Forms with validation
- **Icons**: Unicode emojis and CSS icons
- **Build Tool**: Angular CLI with Vite

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Angular CLI** (optional, but recommended)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd frontend

# Install dependencies
npm install

# Start development server
ng serve
```

Navigate to `http://localhost:4200/` in your browser. The app will automatically reload when you make changes.

## 🎮 Demo Mode

Try the application without registration:

1. Go to **http://localhost:4200/login**
2. Click **"🧪 Continue as Guest (Demo Mode)"**
3. Explore the full library with sample data

## 📱 Application Structure

```
src/
├── app/
│   ├── components/
│   │   ├── home/           # Landing page
│   │   ├── login/          # Authentication
│   │   ├── register/       # User registration
│   │   ├── library/        # Main library interface
│   │   └── navbar/         # Navigation component
│   ├── services/
│   │   ├── auth.service.ts # Authentication management
│   │   ├── manga.service.ts# Manga CRUD operations
│   │   └── theme.service.ts# Dark/light theme toggle
│   ├── models/
│   │   └── manga.model.ts  # Data models
│   └── guards/
│       └── auth.guard.ts   # Route protection
├── assets/                 # Static assets
└── styles.css             # Global styles & CSS variables
```

## 🎨 Theme System

The application features a sophisticated theme system using CSS variables:

### CSS Variables
- **Colors**: `--bg-primary`, `--text-primary`, `--card-bg`
- **Effects**: `--shadow`, `--border-color`, `--brand-primary`
- **Responsive**: Automatic system preference detection
- **Persistent**: Theme choice saved in localStorage

### Theme Toggle
- **Location**: Navbar (moon/sun icon)
- **Smooth Transitions**: 0.3s ease animations
- **System Detection**: Respects user's OS theme preference

## 📊 Library Features

### Manga Management
- **Add New Manga**: Title, author, status, rating, tags
- **Edit Entries**: Update any manga information
- **Delete Manga**: Remove from library with confirmation
- **Bulk Operations**: Select multiple manga for actions

### Viewing Options
- **Grid View**: Card-based layout with covers
- **List View**: Compact table format
- **Sorting**: By title, author, status, rating, date
- **Filtering**: Status, favorites, search terms

### Progress Tracking
- **Chapter Progress**: Track current/total chapters
- **Reading Status**: 5 different status categories
- **Statistics**: Overview of reading habits
- **Favorites**: Mark manga as favorites

## 🔧 Development

### Code Scaffolding

Generate new components:
```bash
ng generate component component-name
ng generate service service-name
ng generate guard guard-name
```

### Building for Production

```bash
# Production build
ng build

# Build with specific configuration
ng build --configuration production
```

Build artifacts are stored in the `dist/` directory.

### Running Tests

```bash
# Unit tests with Karma
ng test

# End-to-end tests
ng e2e

# Code coverage
ng test --code-coverage
```

### Code Quality

```bash
# Linting
ng lint

# Format code
npm run format

# Type checking
ng build --aot
```

## 🌐 Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link GitHub repo to Vercel
2. **Auto-Deploy**: Pushes to main branch trigger deployments
3. **Preview Deployments**: PRs get preview URLs
4. **Custom Domain**: Configure custom domain in Vercel dashboard

### Manual Build

```bash
# Build for production
ng build --configuration production

# Serve dist folder with any static server
npx http-server dist/frontend
```

### Environment Configuration

Create environment files:
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-api.fly.dev/api'
};
```

## 🔒 Authentication

### Guest Mode
- **Demo Data**: Pre-loaded sample manga library
- **Full Functionality**: All features available without login
- **No Backend Required**: Works completely offline

### User Authentication
- **JWT Tokens**: Secure token-based authentication
- **Auto-Refresh**: Automatic token renewal
- **Route Guards**: Protected routes for authenticated users
- **Persistent Sessions**: Remember login across browser sessions

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px (single column layout)
- **Tablet**: 768px - 1024px (adaptive grid)
- **Desktop**: > 1024px (full feature layout)

### Mobile Optimizations
- **Touch-Friendly**: Large tap targets and gestures
- **Swipe Navigation**: Swipe gestures for mobile users
- **Collapsible Navigation**: Space-efficient mobile navbar
- **Optimized Images**: Responsive image loading

## 🎯 Performance Features

- **Lazy Loading**: Route-based code splitting
- **OnPush Strategy**: Optimized change detection
- **Virtual Scrolling**: Efficient large list rendering
- **Image Optimization**: Lazy image loading with placeholders
- **Service Workers**: Offline functionality (when enabled)
=======
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
>>>>>>> server

## 🐛 Troubleshooting

### Common Issues

<<<<<<< HEAD
**Build Errors**
```bash
# Clear Angular cache
ng cache clean

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Development Server Issues**
```bash
# Use different port
ng serve --port 4201

# Clear browser cache and restart
```

**Theme Not Applying**
```bash
# Check CSS variable support
# Ensure modern browser (IE11+ not supported)
```

## 📚 Project Highlights

### Modern Angular Features
- **Standalone Components**: No NgModules required
- **Angular Signals**: Reactive state management
- **Control Flow**: New @if, @for syntax
- **TypeScript**: Full type safety throughout

### Best Practices
- **Component Architecture**: Modular, reusable components
- **Service Layer**: Separation of concerns
- **Error Handling**: Comprehensive error management
- **Accessibility**: WCAG compliant where applicable

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request
=======
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
>>>>>>> server

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<<<<<<< HEAD
## 🔗 Links

- **Live Demo**: [Your Vercel URL]
- **Backend API**: [Your Fly.io URL]
- **GitHub Repository**: [Your GitHub URL]
- **Angular Documentation**: https://angular.dev/

## 🙏 Acknowledgments

- **Angular Team**: For the amazing framework
- **Vercel**: For seamless deployment
- **Community**: For inspiration and feedback

---

Built with ❤️ using Angular 20 and modern web technologies.
=======
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
>>>>>>> server
