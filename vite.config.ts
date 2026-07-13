import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

export default defineConfig({
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    /* E3: with `VITE_API_URL=/api`, API calls proxy to the real server
     * (server/index.ts, `npm run api`) on the same origin — no CORS. */
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /* D5: recharts and framer-motion are the two heaviest deps —
         * split into their own vendor chunks so they cache independently
         * of app code and of each other. lucide-react is already
         * per-icon tree-shaken by Rollup, so it doesn't need its own. */
        manualChunks: {
          recharts: ["recharts"],
          "framer-motion": ["framer-motion"],
        },
      },
    },
  },
});
