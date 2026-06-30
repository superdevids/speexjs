import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/server/bun/index.ts' },
  outDir: 'dist/bun',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  target: 'esnext',
  clean: true,
  splitting: false,
  minify: true,
  treeshake: true,
  external: ['tsx'],
})
