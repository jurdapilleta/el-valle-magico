import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the same build works at a domain root, a GitHub Pages
  // sub-path and inside a Capacitor WebView.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      workbox: {
        // Offline-first: precache everything, no runtime network calls.
        globPatterns: ['**/*.{js,css,html,png,svg,glb,bin,ktx2,webm,m4a,wav,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'El Valle Mágico',
        short_name: 'Valle Mágico',
        description: 'Un valle tranquilo para aprender jugando con Luna.',
        lang: 'es',
        id: './',
        start_url: './',
        scope: './',
        categories: ['kids', 'education', 'games'],
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#BFE3FF',
        theme_color: '#BFE3FF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber'],
        },
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
