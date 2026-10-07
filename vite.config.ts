import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` must match the GitHub repo name so assets resolve on GitHub Pages
// (https://<user>.github.io/LawnCare-Test-GUI/).
export default defineConfig({
  plugins: [react()],
  base: '/LawnCare-Test-GUI/',
});
