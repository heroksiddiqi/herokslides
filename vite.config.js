import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use the repo name for GitHub Pages, but '/' for Vercel or other providers
  base: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? '/herokslides/' : '/',
})
