import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This forces Vite to use the correct version of the Excel library
      './xlsx': './xlsx.mjs' 
    }
  },
  optimizeDeps: {
    // This ensures the library is pre-bundled correctly
    include: ['xlsx'] 
  }
})