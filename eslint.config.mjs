import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Leading underscore = intentionally unused (e.g. omitting a key by destructuring).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Test doubles deliberately mimic Mongoose's loosely typed API.
    files: ['src/server/test/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
