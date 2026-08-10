import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Deploy target is a static host under a project path (GitHub Pages or similar),
// so every asset URL has to be relative. Override with BASE_PATH at build time.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'MovingOut',
        short_name: 'MovingOut',
        description: 'Calculadora de independencia — Madrid, EUR',
        lang: 'es-ES',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#EBE4D9',
        theme_color: '#1E1813',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole app is the offline shell: no backend, no runtime fetches.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    // src/lib is the pure calculation layer — plain in, plain out, nothing to mock.
    include: ['src/lib/**/*.test.ts'],
    environment: 'node',
  },
});
