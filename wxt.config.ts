import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Phantom Trail',
    description:
      'AI-native Chrome extension that makes invisible data collection visible in real-time',
    version: '0.1.0',
    permissions: ['webRequest', 'storage', 'activeTab', 'tabs', 'alarms', 'notifications'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: '/icon/icon-16.png',
      32: '/icon/icon-32.png',
      48: '/icon/icon-48.png',
      128: '/icon/icon-128.png',
    },
    web_accessible_resources: [
      {
        resources: ['content-main-world.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress specific warnings that don't affect functionality
          if (
            warning.code === 'EVAL' ||
            warning.code === 'MODULE_LEVEL_DIRECTIVE'
          ) {
            return;
          }
          warn(warning);
        },
      },
      chunkSizeWarningLimit: 1000, // Increase limit for Cytoscape.js
    },
    define: {
      // Ensure proper environment variables
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
    },
    optimizeDeps: {
      include: ['cytoscape'],
    },
  }),
});
