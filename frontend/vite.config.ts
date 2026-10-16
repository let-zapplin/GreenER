import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^maplibre-gl$/, replacement: fileURLToPath(new URL('./src/lib/maplibre-compat.ts', import.meta.url)) }],
  },
  optimizeDeps: {
    exclude: ['@maptiler/sdk', 'maplibre-gl-original', 'maplibre-gl'],
    include: ['events'],
  },
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  server: {
    port: 5173,
    strictPort: true,
  },
});
