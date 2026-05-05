import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  // ── Vitest configuration ──────────────────────────────────────
  test: {
    environment: 'jsdom',   // simulate browser DOM for React components
    globals: true,          // no need to import describe/it/expect manually
  },
})
