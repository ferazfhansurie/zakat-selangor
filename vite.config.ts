import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    commonjsOptions: {
      include: ["tailwind.config.js", "node_modules/**"],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'], // Example: separate vendor libraries
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase the limit if necessary
  },
  optimizeDeps: {
    include: ["tailwind-config"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "tailwind-config": fileURLToPath(new URL("./tailwind.config.js", import.meta.url)),
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Change this to your backend server's URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/chats': {
        target: 'http://localhost:3000', // Change this to your backend server's URL
        changeOrigin: true,
      },
    },
  },
});
