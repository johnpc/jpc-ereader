import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Ensure PWA files are copied to dist
      external: [],
    },
  },
  // Ensure service worker and manifest are served correctly
  publicDir: 'public',
  server: {
    // Enable HTTPS for PWA testing (optional)
    // https: true,
    host: true, // Allow external connections for mobile testing
  },
  preview: {
    host: true, // Allow external connections for mobile testing
  }
})
