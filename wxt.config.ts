import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Phantom Trail',
    description:
      'AI-native Chrome extension that makes invisible data collection visible in real-time',
    version: '0.1.0',
    permissions: ['webRequest', 'storage', 'activeTab', 'tabs'],
    host_permissions: ['<all_urls>'],
  },
  vite: () => ({
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress specific warnings that don't affect functionality
          if (warning.code === 'EVAL' || warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return;
          }
          // Don't treat vis-network import as an error
          if (warning.code === 'UNRESOLVED_IMPORT' && warning.id?.includes('vis-network')) {
            return;
          }
          warn(warning);
        },
      },
    },
    define: {
      // Ensure proper environment variables
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
    optimizeDeps: {
      include: ['vis-network'],
    },
  }),
});
