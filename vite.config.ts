import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Deploy target is a static host under a project path (GitHub Pages or similar),
// so every asset URL has to be relative. Override with BASE_PATH at build time.
const base = process.env.BASE_PATH ?? '/';

// Three targets from one source. 'web' is the PWA on a static host; 'electron'
// and 'android' wrap the same build in a native shell, where the service worker
// is not just redundant but harmful — an offline cache inside an app that is
// already offline has nothing to add and one way to fail, by serving a stale
// shell after an update. Both shells serve the assets themselves.
const target = process.env.APP_TARGET ?? 'web';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      disable: target !== 'web',
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
        // --bg and --ink from the Independencia token block. These two are the
        // only palette values that cannot read tokens.css: the manifest is
        // written before any stylesheet loads, and on Android they are what the
        // splash and the status bar are painted with.
        background_color: '#EFEDE7',
        theme_color: '#17191C',
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
