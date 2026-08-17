import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backend = 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/uploads': { target: backend, changeOrigin: true },
      '/ws': { target: backend, ws: true },
    },
  },
})
