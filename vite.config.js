import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quizApiPlugin } from './server/api.js'

export default defineConfig({
  plugins: [vue(), quizApiPlugin()],
  server: {
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/server/**', '**/tests/**', '**/src/data/**'] }
  }
})
