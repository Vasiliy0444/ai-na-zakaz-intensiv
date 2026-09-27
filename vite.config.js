import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages отдаёт сайт из main:/docs по адресу /ai-na-zakaz-intensiv/.
// Страницы index.html, a/, b/, c/, privacy/ генерирует scripts/build-pages.mjs из src/template.html.
export default defineConfig({
  base: '/ai-na-zakaz-intensiv/',
  plugins: [tailwindcss()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        a: resolve(import.meta.dirname, 'a/index.html'),
        b: resolve(import.meta.dirname, 'b/index.html'),
        c: resolve(import.meta.dirname, 'c/index.html'),
        privacy: resolve(import.meta.dirname, 'privacy/index.html'),
      },
    },
  },
});
