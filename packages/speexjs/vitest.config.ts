import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/cli/index.ts',
        'src/native/index.ts',
      ],
      thresholds: {
        lines: 96,
        functions: 97,
        branches: 90,
        statements: 96,
      },
    },
  },
})
