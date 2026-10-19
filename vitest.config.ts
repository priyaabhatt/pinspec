import { defineConfig } from 'vitest/config'

// Unit tests only. The end-to-end tests in e2e/ use node:test and a real
// browser; run them with `npm run test:e2e`.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
})
