import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://172.16.10.71:4000',
        changeOrigin: true,
      },
      '/traceability-api': {
        target: 'http://172.16.10.71:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/traceability-api/, '/api/v1'),
      },
    },
  },
})