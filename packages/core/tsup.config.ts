import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/core/index.ts',
    'src/math/index.ts',
    'src/date/index.ts',
    'src/collection/index.ts',
    'src/string/index.ts',
    'src/async/index.ts',
    'src/io/index.ts',
    'src/type/index.ts',
    'src/crypto/index.ts',
    'src/path/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'es2022',
})
