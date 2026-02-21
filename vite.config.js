import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages: set to your repo name
  // e.g. https://<username>.github.io/contact-project/
  base: '/contact-project/',
})
