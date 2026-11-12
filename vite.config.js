import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins:[vue()],
  server:{
    proxy:{'/api':{target:'http://127.0.0.1:3001'}},
    fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/server/**','**/tests/**','**/src/data/**']}
  },
  preview:{proxy:{'/api':{target:'http://127.0.0.1:3001'}}}
})
