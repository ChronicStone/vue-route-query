import { defineConfig } from 'vite-plus'

const ignorePatterns = [
  'apps/docs/.data/**',
  'apps/docs/.nuxt/**',
  'apps/docs/.output/**',
  'apps/docs/node_modules/**',
  'node_modules/**',
  'packages/*/build/**',
  'CHANGELOG.md',
  '**/CHANGELOG.md',
  'bun.lock',
]

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    plugins: ['import', 'vitest'],
    categories: {
      correctness: 'error',
      suspicious: 'error',
    },
    env: {
      builtin: true,
    },
    rules: {
      'no-underscore-dangle': ['error', { allow: ['__devtools__'] }],
    },
    ignorePatterns,
    options: {
      denyWarnings: true,
      typeAware: false,
      typeCheck: false,
    },
  },
  fmt: {
    printWidth: 100,
    singleQuote: true,
    semi: false,
    sortImports: {},
    ignorePatterns,
  },
})
