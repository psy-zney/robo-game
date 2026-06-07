import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Three.js is isolated in a lazy-loaded 3D vendor chunk. Keep the warning
    // focused on accidental app-code growth, not the expected engine payload.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
    },
  },
});
