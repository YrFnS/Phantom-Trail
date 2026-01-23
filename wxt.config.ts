import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Phantom Trail',
    description:
      'AI-native Chrome extension that makes invisible data collection visible in real-time',
    version: '0.1.0',
    permissions: [
      'webRequest',
      'storage',
      'activeTab',
      'tabs',
      'alarms',
      'notifications',
      'downloads',
      'management',
    ],
    host_permissions: ['<all_urls>'],
    commands: {
      'toggle-popup': {
        suggested_key: {
          default: 'Ctrl+Shift+P',
          mac: 'Command+Shift+P',
        },
        description: 'Toggle Phantom Trail popup',
      },
      'quick-analysis': {
        suggested_key: {
          default: 'Ctrl+Shift+A',
          mac: 'Command+Shift+A',
        },
        description: 'Quick privacy analysis of current site',
      },
      'export-data': {
        suggested_key: {
          default: 'Ctrl+Shift+E',
          mac: 'Command+Shift+E',
        },
        description: 'Export privacy data',
      },
    },
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
            warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
            warning.code === 'CIRCULAR_DEPENDENCY'
          ) {
            return;
          }
          warn(warning);
        },
      },
      chunkSizeWarningLimit: 1500, // Increase limit for complex extension
      target: 'es2020', // Ensure compatibility with Chrome extensions
    },
    define: {
      // Ensure proper environment variables
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
    },
    optimizeDeps: {
      include: ['cytoscape', 'vis-network', 'chart.js'],
      exclude: ['chrome'], // Exclude chrome APIs from bundling
    },
    resolve: {
      alias: {
        // Ensure proper resolution of chrome APIs
        'webextension-polyfill':
          'webextension-polyfill/dist/browser-polyfill.js',
      },
    },
  }),
});
