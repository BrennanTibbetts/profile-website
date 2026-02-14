import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl"

// This is required for Vite to work correctly with CodeSandbox
const server = process.env.APP_ENV === "sandbox" ? { hmr: { clientPort: 443 } } : {};
const buildDate = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig({
  server: server,
  plugins: [
    react(),
    glsl()
  ],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor': ['zustand', 'leva', 'three-custom-shader-material']
        }
      }
    },
    chunkSizeWarningLimit: 1500
  }
});
