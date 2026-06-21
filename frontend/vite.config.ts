import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` must match the GH Pages project path in production, but stay `/`
// in dev so the local server works without prefix gymnastics.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/supatroppers/' : '/',
  server: {
    port: 5173,
  },
}));
