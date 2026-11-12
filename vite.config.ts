import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { runtimeNotices } from './scripts/runtime-notices.mjs'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'ida-runtime-notices',
    async generateBundle(_, bundle) {
      const modules = Object.values(bundle).flatMap(output => output.type === 'chunk'
        ? Object.entries(output.modules).filter(([, data]) => data.renderedLength > 0).map(([id]) => id) : [])
      this.emitFile({ type: 'asset', fileName: 'RUNTIME_NOTICES.txt', source: await runtimeNotices(modules) })
    },
  }, {
    name: 'ida-pages-csp',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'meta', injectTo: 'head-prepend',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'",
      },
    }],
  }],
  optimizeDeps: { include: ['@react-three/postprocessing', 'postprocessing', 'canvas-confetti', '@radix-ui/react-dialog', '@base-ui/react/field'] },
  server: { port: 5173, strictPort: true },
})
