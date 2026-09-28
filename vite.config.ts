import { defineConfig } from 'vite';

export default defineConfig({
  server: { watch: { ignored: ['**/artifacts/**', '**/test-results/**', '**/playwright-report/**'] } },
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/utils/SkeletonUtils.js', 'three/examples/jsm/utils/BufferGeometryUtils.js'],
  },
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
