import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Server
    'server/index': 'src/server/index.ts',
    'server/http/index': 'src/server/http/index.ts',
    'server/router/index': 'src/server/router/index.ts',
    'server/middleware/index': 'src/server/middleware/index.ts',
    'server/controller/index': 'src/server/controller/index.ts',
    'server/container/index': 'src/server/container/index.ts',
    'server/auth/index': 'src/server/auth/index.ts',
    'server/gate/index': 'src/server/gate/index.ts',
    'server/cache/index': 'src/server/cache/index.ts',
    'server/storage/index': 'src/server/storage/index.ts',
    'server/events/index': 'src/server/events/index.ts',
    'server/database/index': 'src/server/database/index.ts',
    // Client
    'client/index': 'src/client/index.ts',
    'client/signals/index': 'src/client/signals/index.ts',
    'client/vdom/index': 'src/client/vdom/index.ts',
    'client/vdom/jsx-runtime': 'src/client/vdom/jsx-runtime.ts',
    // RPC
    'rpc/index': 'src/rpc/index.ts',
    // Schema
    'schema/index': 'src/schema/index.ts',
    // CLI
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  target: 'es2022',
  clean: true,
  splitting: false,
  minify: false,
  external: [],
})
