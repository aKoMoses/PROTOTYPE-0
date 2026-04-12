import { resolve } from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  plugins: [
    VitePWA({
      /* Service worker registration mode.
        autoUpdate: the SW installs and activates silently in the background
        so installed PWAs pick up fresh bundles without requiring a manual
        reinstall or an explicit update button. */
      registerType: "autoUpdate",

      /* Include these static assets in the SW precache manifest. */
      includeAssets: [
        "icons/pwa/favicon.svg",
        "icons/pwa/apple-touch-icon.png",
        "icons/pwa/pwa-192x192.png",
        "icons/pwa/pwa-512x512.png",
      ],

      /* Web App Manifest */
      manifest: {
        name: "Prototype-0 — Arena Shell",
        short_name: "P0 Arena",
        description: "Scrap-tech duel prototype – real-time arena combat.",
        theme_color: "#050d05",
        background_color: "#050d05",
        display: "standalone",
        orientation: "landscape",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "icons/pwa/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/pwa/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/pwa/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      /* Workbox configuration.
         Strategy: NetworkFirst for HTML so updates are picked up quickly.
         CacheFirst for immutable build assets (JS, CSS with hashes).
         Audio/music assets are large — stale-while-revalidate to avoid
         blocking the first load while still caching them. */
      workbox: {
        /* Pre-cache all built JS, CSS, HTML, icons and small images. */
        globPatterns: ["**/*.{js,css,html,ico,woff2}", "icons/pwa/*.{png,svg}"],

        /* Exclude heavy asset directories from the precache.
           These are loaded on demand and not required for offline shell launch. */
        globIgnores: [
          "**/music/**",
          "**/sfx/**",
          "**/assets/parts/**",
          "**/assets/weapons/**",
          "**/icons/parts/**",
          "**/icons/weapons/**",
        ],

        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        runtimeCaching: [
          {
            /* Game audio: cache-first once fetched, max 50 files. */
            urlPattern: /\/(music|sfx)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "p0-audio-v1",
              expiration: { maxEntries: 50 },
            },
          },
          {
            /* Supabase API calls: network-only, never cache auth traffic. */
            urlPattern: /supabase\.co/,
            handler: "NetworkOnly",
          },
          {
            /* Colyseus WS: not a fetch — Workbox ignores WS automatically. */
            urlPattern: /colyseus/,
            handler: "NetworkOnly",
          },
        ],
      },

      /* Enable the SW in development so you can test Install on localhost. */
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
});