import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Blog posts without a date fall back to the build date (see src/blog/posts.js).
const buildDate = new Date().toISOString();

// Libraries change far less often than the site, so each group gets its own
// file that browsers keep cached across deploys. React loads with the page;
// three.js and the React Three libraries load with the 3D views.
function vendorChunk(id) {
  // Vite's dynamic-import helper is used by the page and by the 3D libraries;
  // left alone it lands with the latter and drags them into the first load.
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id) || id.includes("vite/preload-helper")) {
    return "react";
  }
  if (!id.includes("node_modules")) {
    return undefined;
  }
  if (id.includes("node_modules/three/")) {
    return "three";
  }
  return "r3f";
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  build: {
    target: "es2020",
    // three.js alone is ~690 kB; it's already split out and loads after the text.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
});
