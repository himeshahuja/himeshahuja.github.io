import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // three.js loads in its own lazy chunk, after the page's words.
  build: { chunkSizeWarningLimit: 700 },
})
