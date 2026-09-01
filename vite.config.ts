import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import loadVersion from 'vite-plugin-package-version';
import { VitePWA } from 'vite-plugin-pwa';

const vendors = ['highlight', 'katex', 'pdfjs', 'radix-ui', 'react-icons', 'chart.js'];

export default defineConfig({
  plugins: [
    react(),
    loadVersion(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        id: 'localui',
        name: 'LocalUI - AI Chat Interface',
        short_name: 'LocalUI',
        description: 'AI Chat Interface',
        display: 'standalone',
        theme_color: '#000000',
        background_color: '#000000',
        start_url: '.',
        scope: '.',
        orientation: 'any',
        lang: 'en',
        icons: [
          {
            purpose: 'maskable',
            sizes: '512x512',
            src: 'assets/manifest-icon-512.maskable.png',
            type: 'image/png',
          },
          {
            purpose: 'any',
            sizes: '192x192',
            src: 'assets/manifest-icon-192.maskable.png',
            type: 'image/png',
          },
        ],
        shortcuts: [
          {
            name: 'New Chat',
            url: '/',
            description: 'Start a new chat.',
          },
        ],
        categories: ['ai', 'llm', 'chat'],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,woff2,woff}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'document' ||
              request.destination === 'script' ||
              request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: function (file) {
          if (file.names.some((name) => name.includes('css'))) {
            return 'css/[name]-[hash].[ext]';
          }
          if (
            file.names.some(
              (name) =>
                name.includes('woff') ||
                name.includes('woff2') ||
                name.includes('ttf')
            )
          ) {
            return 'fonts/[name].[ext]';
          }
          return 'assets/[name].[ext]';
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const name = id.split('node_modules/')[1].split('/')[0];
            return vendors.find((vendor) => name.includes(vendor)) || 'vendor';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/v1': 'http://localhost:8080',
      '/props': 'http://localhost:8080',
    },
  },
});
