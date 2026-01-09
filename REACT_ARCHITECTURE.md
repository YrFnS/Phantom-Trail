# React Architecture Analysis - Phantom Trail

## Overview
Phantom Trail uses React 19.2.3 with TypeScript in a WXT-based Chrome extension architecture. The project follows modern React patterns with Tailwind CSS for styling and Zustand for state management.

## WXT Framework Integration

### Configuration (`wxt.config.ts`)
```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'], // React integration module
  manifest: {
    name: 'Phantom Trail',
    permissions: ['webRequest', 'storage', 'activeTab', 'tabs'],
    host_permissions: ['<all_urls>']
  }
});
```

**Key Points:**
- Uses `@wxt-dev/module-react` for seamless React integration
- Manifest V3 compliant configuration
- TypeScript support built-in

### Entry Point Structure (`entrypoints/popup/`)
```
entrypoints/popup/
├── main.tsx          # React root mounting
├── App.tsx           # Main component
├── style.css         # Tailwind imports
└── index.html        # HTML template (auto-generated)
```

## React Component Architecture

### Main Entry Point (`main.tsx`)
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Patterns:**
- Uses React 18+ `createRoot` API
- Strict Mode enabled for development checks
- Clean separation of concerns

### Root Component (`App.tsx`)
```typescript
function App() {
  return (
    <div className="w-96 h-96 p-4 bg-gray-50">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Phantom Trail</h1>
        <p className="text-sm text-gray-600">Privacy tracking in real-time</p>
      </header>
      
      <main className="space-y-4">
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <h2 className="font-medium text-gray-900 mb-2">Live Activity</h2>
          <p className="text-sm text-gray-500">No tracking detected yet...</p>
        </div>
        
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <h2 className="font-medium text-gray-900 mb-2">Risk Level</h2>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Low Risk</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
```

**Component Patterns:**
- Functional component with JSX
- Semantic HTML structure (`header`, `main`)
- Consistent Tailwind class organization
- Component-level export pattern

## Styling Architecture

### Tailwind CSS Integration (`style.css`)
```css
@import "tailwindcss";

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Tailwind Configuration (`tailwind.config.js`)
```javascript
export default {
  content: [
    "./entrypoints/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        phantom: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        }
      }
    },
  },
  plugins: [],
};
```

**Styling Patterns:**
- Utility-first approach with Tailwind
- Custom color palette (`phantom` theme)
- Content paths include both entrypoints and components
- System font stack for cross-platform consistency

## State Management Architecture

### Zustand Integration
```typescript
// Available in package.json
"zustand": "^5.0.2"
```

**Planned Patterns:**
- Lightweight state management with Zustand
- Store-based architecture for extension state
- TypeScript integration for type safety

## Project Structure Patterns

### Current Architecture
```
phantom-trail/
├── entrypoints/           # WXT entry points
│   ├── background.ts      # Service worker
│   ├── content.ts         # Content scripts  
│   └── popup/             # Popup UI
│       ├── main.tsx       # React root
│       ├── App.tsx        # Main component
│       └── style.css      # Styles
├── components/            # Reusable React components (empty)
├── lib/                   # Core utilities
│   ├── ai-engine.ts       # AI integration
│   ├── tracker-db.ts      # Tracker classification
│   ├── storage-manager.ts # Chrome storage
│   └── types.ts           # TypeScript types
└── assets/                # Static assets
```

### Recommended Component Organization
```
components/
├── LiveNarrative/         # AI narrative display
├── NetworkGraph/          # Vis.js network visualization
├── ChatInterface/         # AI chat component
├── RiskDashboard/         # Risk assessment UI
└── shared/                # Common UI components
    ├── Button/
    ├── Card/
    └── StatusIndicator/
```

## TypeScript Integration

### Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["entrypoints", "components", "lib"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**TypeScript Patterns:**
- Strict mode enabled
- Modern ES2020 target
- React JSX transform
- Comprehensive type checking

## Development Patterns

### Available Scripts
```json
{
  "scripts": {
    "dev": "wxt",              // Development server with HMR
    "build": "wxt build",      // Production build
    "zip": "wxt zip",          // Create extension package
    "type-check": "tsc --noEmit" // Type checking only
  }
}
```

### Hot Module Replacement
- WXT provides built-in HMR for React components
- Changes reflect immediately in extension popup
- Preserves extension state during development

## Extension-Specific Patterns

### Chrome API Integration
```typescript
// lib/storage-manager.ts pattern
export class StorageManager {
  static async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }
}
```

### Background Script Communication
```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  // Service worker logic
  chrome.webRequest.onBeforeRequest.addListener(
    // Request interception
  );
});
```

## Recommended Patterns for Future Development

### Component Structure
```typescript
// components/LiveNarrative/LiveNarrative.tsx
interface LiveNarrativeProps {
  events: TrackingEvent[];
  isLoading: boolean;
}

export const LiveNarrative: React.FC<LiveNarrativeProps> = ({ 
  events, 
  isLoading 
}) => {
  return (
    <div className="space-y-2">
      {/* Component implementation */}
    </div>
  );
};
```

### State Management with Zustand
```typescript
// lib/stores/tracking-store.ts
interface TrackingState {
  events: TrackingEvent[];
  riskLevel: RiskLevel;
  addEvent: (event: TrackingEvent) => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  events: [],
  riskLevel: 'low',
  addEvent: (event) => set((state) => ({ 
    events: [...state.events, event] 
  })),
}));
```

### Custom Hooks Pattern
```typescript
// lib/hooks/useTrackingData.ts
export const useTrackingData = () => {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  
  useEffect(() => {
    // Chrome extension messaging
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TRACKING_EVENT') {
        setEvents(prev => [...prev, message.data]);
      }
    });
  }, []);
  
  return { events };
};
```

## Performance Considerations

### Bundle Size Optimization
- WXT automatically optimizes React bundles
- Tree shaking enabled for unused code elimination
- Separate chunks for different entry points

### Extension-Specific Optimizations
- Lazy loading for heavy components (vis-network, chart.js)
- Efficient Chrome storage usage
- Minimal background script footprint

## Security Patterns

### Content Security Policy
- Manifest V3 compliance
- No inline scripts or eval()
- Secure communication between components

### Data Handling
- Local-first data processing
- Encrypted storage for sensitive data
- Minimal permissions principle

This architecture provides a solid foundation for building the Phantom Trail extension with modern React patterns, efficient state management, and extension-specific optimizations.