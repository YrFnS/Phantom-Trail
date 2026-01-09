import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Phantom Trail',
    description: 'AI-native Chrome extension that makes invisible data collection visible in real-time',
    version: '0.1.0',
    permissions: [
      'webRequest',
      'storage',
      'activeTab',
      'tabs'
    ],
    host_permissions: [
      '<all_urls>'
    ]
  }
});
