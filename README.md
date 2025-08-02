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

## 🐛 Troubleshooting

### Common Issues

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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