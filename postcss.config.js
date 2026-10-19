import tailwind from '@tailwindcss/postcss'
import shadowSafe from './build/postcss-shadow-safe.js'

export default {
  plugins: [tailwind(), shadowSafe()],
}
