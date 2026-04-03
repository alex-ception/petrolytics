import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  server: {
    port: 3010,
    host: true,
    proxy: {
      '/fred-api': {
        target: 'https://api.stlouisfed.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fred-api/, '')
      },
      '/gouv-api': {
        target: 'https://data.economie.gouv.fr/api/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gouv-api/, '')
      }
    }
  }
});
