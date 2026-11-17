import { defineConfig } from 'vite'

// Electron loads dist/index.html via file://, so asset URLs must be relative.
export default defineConfig({
  base: './',
})
