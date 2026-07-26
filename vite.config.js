import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 引入這個

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 加入這個
  ],
})