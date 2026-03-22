import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: { 'process.env': {} },
  build: {
    target: 'es2020', // required for BigInt support
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020', // required for BigInt support in dependencies
    },
  },
})
