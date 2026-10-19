import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/background/index.ts',
      formats: ['es'],
      fileName: () => 'background.js',
    },
  },
})
