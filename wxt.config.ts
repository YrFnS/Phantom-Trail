import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Phantom Trail',
    description:
      'Experimental Chrome extension for inspecting possible web-tracking signals',
    version: '0.1.0',
    permissions: ['webRequest', 'storage', 'tabs', 'alarms'],
    optional_permissions: ['management', 'notifications'],
    host_permissions: ['http://*/*', 'https://*/*'],
    commands: {
      'toggle-popup': {
        suggested_key: {
          default: 'Ctrl+Shift+P',
          mac: 'Command+Shift+P',
        },
        description: 'Open the Phantom Trail popup',
      },
      'quick-analysis': {
        suggested_key: {
          default: 'Ctrl+Shift+A',
          mac: 'Command+Shift+A',
        },
        description: 'Open the current-page evidence dashboard',
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
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
  },
  vite: () => ({
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Existing prototype exceptions. These warnings must be reviewed
          // before Phantom Trail can be described as production-ready.
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
      chunkSizeWarningLimit: 1500,
      target: 'es2020',
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
    },
    optimizeDeps: {
      include: ['cytoscape', 'vis-network', 'chart.js'],
      exclude: ['chrome'],
    },
    resolve: {
      alias: {
        'webextension-polyfill':
          'webextension-polyfill/dist/browser-polyfill.js',
      },
    },
  }),
});
