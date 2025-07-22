# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chatlog Web is a Vue.js 3-based web management interface for visualizing and analyzing WeChat chat data. It connects to the [chatlog](https://github.com/sjzar/chatlog) backend service via HTTP API to provide real-time data analysis, visualization charts, and chat record management.

## Development Commands

**Start development server:**
```bash
npm run serve
# Runs on http://localhost:8080
# Requires chatlog backend service running on port 5030
```

**Build for production:**
```bash
npm run build
# Output to dist/ directory
```

**Lint code:**
```bash
npm run lint
# Uses ESLint with Vue and standard config
```

**Install dependencies:**
```bash
npm install
# or yarn install / pnpm install
```

## Backend Dependency

This frontend requires the chatlog backend service to be running:

1. Install chatlog: `go install github.com/sjzar/chatlog@latest`
2. Get WeChat keys: `chatlog key`  
3. Decrypt data: `chatlog decrypt`
4. Start API server: `chatlog server` (runs on port 5030)

## Architecture Overview

### Core Stack
- **Vue.js 3.3** with Composition API
- **Vue Router 4.2** for SPA routing  
- **Vuex 4.0** for state management
- **Element Plus 2.3** for UI components
- **ECharts 5.6** + **Vue-ECharts 7.0** for data visualization
- **Axios** for HTTP requests with CSV/text parsing

### Key Components

**Layout System:**
- `src/layout/index.vue` - Main layout with collapsible sidebar and navigation

**Core Views:**
- `src/views/Analytics.vue` - Main data analysis page with 6 chart types
- `src/views/Dashboard.vue` - Overview dashboard with quick stats
- `src/views/ChatLog.vue` - Chat record search and display
- Other views for contacts, chatrooms, sessions, media management

**Data Layer:**
- `src/api/index.js` - API client with custom CSV/text parsers for chatlog backend
- `src/store/index.js` - Vuex store for centralized state management

### API Integration

The backend returns CSV/plain text data that gets parsed into JSON:
- **Chat logs**: Text format parsing with sender/time/content extraction
- **Contacts/Chatrooms**: CSV parsing with header mapping  
- **Sessions**: Custom text format parsing
- **Media**: Direct URL construction for images/videos/files

### Proxy Configuration

Development proxy in `vue.config.js` forwards requests to chatlog backend:
```javascript
proxy: {
  '/api': { target: 'http://127.0.0.1:5030' },
  '/image': { target: 'http://127.0.0.1:5030' },
  '/video': { target: 'http://127.0.0.1:5030' }
  // ... other media endpoints
}
```

## Key Features

**Data Visualization (Analytics page):**
- Message trend analysis with date range filtering
- User activity heatmap (24h × 7 days)
- Chat type distribution (text/image/voice/video/file)
- Word frequency analysis with keyword extraction
- 24-hour activity distribution
- Top 10 active chatroom rankings

**State Management:**
- Centralized loading states
- Cached API responses  
- Pagination handling
- Global error handling

## Development Guidelines

**Component Structure:**
- Use Vue 3 Composition API patterns
- Follow Element Plus theming and component standards
- Implement responsive design with CSS Grid/Flexbox

**Data Handling:**
- All API responses go through custom parsers in `src/api/index.js`
- State management via Vuex actions/mutations
- Error handling with try/catch and user notifications

**Chart Implementation:**
- Use Vue-ECharts wrapper for all visualizations
- Responsive chart sizing with `resize` listeners
- Custom color schemes and gradient effects

**Code Style:**
- ESLint with Vue and Standard configurations
- PascalCase for components, camelCase for files
- Chinese text for UI labels (target Chinese users)

## Common Issues

**Backend Connection:**
- Ensure chatlog service is running on port 5030
- Check proxy configuration if API calls fail in development
- Verify CORS settings for production deployment

**Data Parsing:**
- CSV parser handles malformed data gracefully
- Text parsers use regex matching for structured formats
- Type checking prevents runtime errors from unexpected data types