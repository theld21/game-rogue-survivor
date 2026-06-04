import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3337,
    host: true,
    allowedHosts: true
  },
  build: {
    minify: 'terser',
    sourcemap: false,
    outDir: 'dist'
  }
});
