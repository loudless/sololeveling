import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Для GitHub Pages: замени 'solo-leveling' на имя своего репо
  // Для кастомного домена или root-репо — убери base
  base: '/sololeveling/',
})
