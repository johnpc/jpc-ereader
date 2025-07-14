# JPC E-Reader

A modern e-reader application built with React, TypeScript, and epub.js that provides a seamless reading experience for EPUB books.

## Features

- **Book Library**: Browse and discover books from the JPC OPDS catalog (https://ebooks.jpc.io/opds)
- **EPUB Reader**: Full-featured reading experience powered by epub.js
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface built with React and TypeScript
- **Fast Performance**: Optimized with Vite for quick loading and hot module replacement

## Requirements

### Functional Requirements

1. **Book Discovery**
   - Fetch and display book catalog from https://ebooks.jpc.io/opds
   - Show book metadata (title, author, cover image, description)
   - Support browsing and searching through available books
   - Handle OPDS feed parsing and navigation

2. **Book Reading**
   - Open EPUB books using epub.js reader
   - Support standard reading features:
     - Page navigation (next/previous)
     - Table of contents navigation
     - Text size adjustment
     - Theme switching (light/dark mode)
     - Bookmarking and progress tracking
   - Responsive reader that works on various screen sizes

3. **User Interface**
   - Clean, modern design with intuitive navigation
   - Book grid/list view for library browsing
   - Full-screen reading mode
   - Loading states and error handling
   - Accessibility features for screen readers

### Technical Requirements

1. **Frontend Framework**
   - React 18+ with TypeScript
   - Vite for build tooling and development server
   - Modern ES6+ JavaScript features

2. **EPUB Handling**
   - epub.js library for EPUB parsing and rendering
   - Support for EPUB 2 and EPUB 3 formats
   - Handle embedded fonts, images, and styling

3. **OPDS Integration**
   - Parse OPDS (Open Publication Distribution System) feeds
   - Handle XML/Atom feed formats
   - Support pagination and feed navigation
   - CORS handling for cross-origin requests

4. **State Management**
   - React hooks for local state management
   - Context API for global state (current book, reading progress)
   - Local storage for user preferences and bookmarks

5. **Styling**
   - CSS modules or styled-components for component styling
   - Responsive design with mobile-first approach
   - Dark/light theme support

## Architecture

```
src/
├── components/           # Reusable UI components
│   ├── BookCard/        # Individual book display
│   ├── BookGrid/        # Book collection display
│   ├── Reader/          # EPUB reader component
│   └── Navigation/      # App navigation
├── services/            # API and data services
│   ├── opdsService.ts   # OPDS feed handling
│   └── epubService.ts   # EPUB file operations
├── hooks/               # Custom React hooks
│   ├── useBooks.ts      # Book data management
│   └── useReader.ts     # Reader state management
├── types/               # TypeScript type definitions
│   ├── book.ts          # Book and OPDS types
│   └── reader.ts        # Reader configuration types
├── utils/               # Utility functions
│   └── opdsParser.ts    # OPDS XML parsing
└── App.tsx              # Main application component
```

## Installation and Setup

```bash
# Install dependencies
npm install

# Install additional dependencies for EPUB and OPDS support
npm install epubjs xml2js

# Install type definitions
npm install -D @types/xml2js

# Start development server
npm run dev

# Build for production
npm run build
```

### CORS Proxy Setup

The application uses a CORS proxy to fetch books from the JPC OPDS catalog due to browser security restrictions. The app is configured to use the hosted proxy at `https://cors-proxy.jpc.io/api/proxy`.

The proxy handles cross-origin requests by:
1. Receiving requests from the frontend at `https://cors-proxy.jpc.io/api/proxy?url=<encoded-url>`
2. Fetching the actual content from the OPDS endpoint
3. Adding proper CORS headers to the response
4. Returning the data to the frontend without CORS restrictions

No additional setup is required as the proxy is already hosted and configured.

## Usage

1. **Browse Books**: The app loads books from the JPC OPDS catalog on startup
2. **Select Book**: Click on any book cover or title to open it in the reader
3. **Read**: Use navigation controls to move through pages, access table of contents, and adjust reading settings
4. **Customize**: Switch between light/dark themes and adjust text size for comfortable reading

## Development

This project uses:
- **React 18** with TypeScript for type-safe component development
- **Vite** for fast development and optimized builds
- **epub.js** for EPUB file parsing and rendering
- **ESLint** for code quality and consistency

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality checks

## Tips for AI Assistants

When working with this project programmatically:

### Development Server
- **Don't run `npm run dev` in foreground** - it will halt execution and block further commands
- Instead, run the dev server in background and pipe output to logs:
  ```bash
  # Run in background with output logging
  npm run dev > dev-server.log 2>&1 &
  
  # Check if server is running
  curl -s http://localhost:5173 > /dev/null && echo "Server is running" || echo "Server not responding"
  
  # View logs
  tail -f dev-server.log
  
  # Stop the server later
  pkill -f "vite"
  ```

### Testing and Debugging
- Use `npm run build` to check for TypeScript errors without starting a server
- Use `npm run preview` to test the production build locally
- Check browser console for runtime errors when testing functionality

### CORS Issues
- The OPDS service may encounter CORS issues when fetching from external catalogs
- Consider using a CORS proxy or browser extensions for development
- Production deployments should handle CORS properly

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- Mobile browsers on iOS Safari and Android Chrome

## License

MIT License - see LICENSE file for details
