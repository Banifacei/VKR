import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // В dev-режиме Vite сам проксирует /api и /uploads на сервер
      '/api': { target: 'http://server:5001', changeOrigin: true },
      '/uploads': { target: 'http://server:5001', changeOrigin: true },
    },
  },
})