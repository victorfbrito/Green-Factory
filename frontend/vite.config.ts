import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    // Proxies API paths. Do not use /users/* for React routes — GET /users/:name is a real API and
    // would return JSON on full page reload. Use e.g. /campus/:username for the factory page.
    proxy: {
      '/users': { target: 'http://localhost:8000', changeOrigin: true },
      '/factories': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
