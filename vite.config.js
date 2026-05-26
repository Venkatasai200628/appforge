import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    proxy: {
      // Proxy Groq API calls to avoid CORS in local dev
      '/groq-api': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/groq-api/, ''),
        secure: true,
      },
      // Keep Anthropic proxy as fallback
      '/anthropic-api': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/anthropic-api/, ''),
        secure: true,
      },
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['zustand', 'clsx', 'lucide-react'],
        }
      }
    }
  }
})
