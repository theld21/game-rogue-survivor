import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 8000,
    host: true,
    allowedHosts: true
  },
  build: {
    minify: 'terser',
    sourcemap: false
  }
});
