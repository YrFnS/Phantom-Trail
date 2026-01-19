import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        Blob: 'readonly',
        
        // Chrome extension globals
        chrome: 'readonly',
        
        // WebRTC globals for P2P functionality
        RTCPeerConnection: 'readonly',
        RTCDataChannel: 'readonly',
        RTCConfiguration: 'readonly',
        RTCIceServer: 'readonly',
        RTCDataChannelInit: 'readonly',
        RTCIceConnectionState: 'readonly',
        RTCDataChannelState: 'readonly',
        
        // DOM types (for TypeScript)
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLOptionElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLUListElement: 'readonly',
        HTMLOListElement: 'readonly',
        HTMLLIElement: 'readonly',
        HTMLTableElement: 'readonly',
        HTMLTableSectionElement: 'readonly',
        HTMLTableRowElement: 'readonly',
        HTMLTableDataCellElement: 'readonly',
        HTMLTableHeaderCellElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        
        // Node.js globals (for build scripts)
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn', // Changed to warn for type definitions
      '@typescript-eslint/triple-slash-reference': 'off', // Allow for WXT generated files
      '@typescript-eslint/ban-ts-comment': 'warn', // Allow for WXT generated files
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'no-undef': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Separate config for advanced feature files (temporary relaxed rules)
    files: [
      'lib/sync-manager.ts', 
      'lib/conflict-resolver.ts', 
      'lib/storage-manager.ts', 
      'lib/privacy-predictor.ts',
      'lib/cache-optimizer.ts',
      'lib/performance-monitor.ts'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Temporarily allow any types in advanced feature files
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in experimental files
      'no-undef': 'off', // Allow undefined globals (browser APIs)
    },
  },
  {
    // Separate config for type definition files
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-undef': 'off',
    },
  },
  {
    // Separate config for test files
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: {
      globals: {
        // Jest globals
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests
    },
  },
  {
    // Separate config for WXT generated files
    files: ['.wxt/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      '.output/**',
      'dist/**',
      'node_modules/**',
      '*.config.js',
      '*.config.ts',
      '.wxt/**',
      'types/**/*.d.ts',
      'scripts/**/*.js',
    ],
  },
];
