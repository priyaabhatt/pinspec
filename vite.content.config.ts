import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// The content script is injected with chrome.scripting.executeScript, which
// runs classic scripts only, so it is bundled as a single IIFE.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/content/index.tsx',
      formats: ['iife'],
      name: 'pinspec',
      fileName: () => 'content.js',
    },
  },
})
