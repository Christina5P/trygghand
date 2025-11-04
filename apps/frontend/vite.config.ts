// apps/frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'apps/frontend',  // <-- pekar till frontend-mappen
  plugins: [react()],
  server: {
    port: 5173,            // eller annan port
    host: true             // tillåter åtkomst från Codespaces URL
  },
  build: {
    outDir: '../../dist/frontend'
  }
})
