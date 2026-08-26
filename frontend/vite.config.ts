import { URL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import svgr from 'vite-plugin-svgr'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const srcAbs = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  return {
    root: projectRoot,
    base: isProduction
      ? '/ns/'
      : '/',
    plugins: [
      react(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      svgr({
        // svgr options: https://react-svgr.com/docs/options/
        svgrOptions: {
          exportType: 'default',
          ref: true,
          svgo: false,
          titleProp: true,
        },
        include: '**/*.svg',
      }),
    ],
    resolve: {
      preserveSymlinks: true,
      alias: {
        src: srcAbs,
        '~': path.join(process.cwd(), 'node_modules'),
        'dynamic-widget-context': path.resolve(
          __dirname,
          'node_modules/@dynamic-labs/sdk-react-core/src/lib/widgets/DynamicWidget/context/DynamicWidgetContext.js'
        ),
      },
    },
    server: {
      host: true,
      port: 8081,
      fs: {
        allow: [projectRoot, srcAbs],
      },
      watch: {
        usePolling: true,
        interval: 100,
        awaitWriteFinish: false,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.vite/**'],
      },
      hmr: {
        host: 'localhost',
        clientPort: 8081,
        protocol: 'ws',
        overlay: true,
      },
    },
    define: { global: 'globalThis' },
    build: {
      sourcemap: false,
      rollupOptions: { output: { entryFileNames: 'assets/index.js' } },
    },
  }
})
