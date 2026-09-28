import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // 'server-only' throws outside a React Server environment; tests call server code directly.
      'server-only': path.resolve(import.meta.dirname, './src/server/test/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB: 'taskora-test',
      SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    },
  },
})
