import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Unified backend (traceability + IoT/master data)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Legacy traceability frontend path
      '/traceability-api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/traceability-api/, '/api/v1'),
      },
    },
  },
})
