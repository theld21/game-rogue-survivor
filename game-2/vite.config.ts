import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 8080,
    host: true,
    allowedHosts: true
  },
  build: {
    minify: 'terser',
    sourcemap: false,
    outDir: 'dist'
  }
});
