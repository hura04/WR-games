import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { open: true },
  build: { rollupOptions: { input: { main: 'index.html', preview: 'preview.html' } } },
});
