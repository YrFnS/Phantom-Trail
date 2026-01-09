# Project Structure

## Directory Layout
```
phantom-trail/
├── wxt.config.ts              # WXT configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── entrypoints/               # Extension entry points
│   ├── background.ts          # Service worker (network interception, AI coordination)
│   ├── content.ts             # Content scripts (in-page tracking detection)
│   ├── popup/                 # Popup UI
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   └── sidepanel/             # Side panel UI (optional)
│       ├── App.tsx
│       ├── main.tsx
│       └── index.html
├── components/                # Shared React components (feature-based)
│   ├── LiveNarrative/         # Real-time tracking narrative
│   │   ├── LiveNarrative.tsx
│   │   ├── LiveNarrative.hooks.ts
│   │   ├── LiveNarrative.types.ts
│   │   └── index.ts
│   ├── NetworkGraph/          # Vis.js data flow visualization
│   │   ├── NetworkGraph.tsx
│   │   ├── NetworkGraph.hooks.ts
│   │   ├── NetworkGraph.types.ts
│   │   └── index.ts
│   ├── ChatInterface/         # Natural language Q&A
│   │   ├── ChatInterface.tsx
│   │   ├── ChatInterface.hooks.ts
│   │   ├── ChatInterface.types.ts
│   │   └── index.ts
│   └── RiskDashboard/         # Risk scores and metrics
│       ├── RiskDashboard.tsx
│       ├── RiskDashboard.hooks.ts
│       ├── RiskDashboard.types.ts
│       └── index.ts
├── lib/                       # Core utilities and services
│   ├── ai-engine.ts           # OpenRouter integration
│   ├── tracker-db.ts          # Tracker classification logic
│   ├── storage-manager.ts     # chrome.storage wrapper
│   └── types.ts               # Shared TypeScript types
├── assets/                    # Static assets
│   └── icon/                  # Extension icons (16, 32, 48, 128px)
├── public/                    # Public static files
├── .kiro/                     # Kiro CLI configuration
│   ├── steering/              # Project context documents
│   └── prompts/               # Custom development prompts
└── docs/                      # Documentation
```

## File Naming Conventions
- **Components**: PascalCase (`LiveNarrative.tsx`, `NetworkGraph.tsx`)
- **Utilities/Services**: kebab-case (`ai-engine.ts`, `storage-manager.ts`)
- **Types**: kebab-case with `.ts` extension (`types.ts`)
- **Entry points**: lowercase (`background.ts`, `content.ts`)
- **Config files**: lowercase with appropriate extension (`wxt.config.ts`)

## Module Organization
- `entrypoints/`: Chrome extension entry points (background, content, popup, sidepanel)
- `components/`: Reusable React UI components
- `lib/`: Core business logic, API integrations, utilities
- `assets/`: Static resources (icons, images)

## Configuration Files
- `wxt.config.ts`: WXT framework configuration
- `tsconfig.json`: TypeScript compiler options
- `tailwind.config.js`: Tailwind CSS customization
- `package.json`: Dependencies and npm scripts
- `.env.local`: Local environment variables (API keys - gitignored)

## Documentation Structure
- `README.md`: Project overview, setup, usage
- `DEVLOG.md`: Development timeline and decisions (hackathon requirement)
- `docs/`: Additional documentation as needed

## Build Artifacts
- `.output/`: WXT build output (gitignored)
- `dist/`: Production build for Chrome Web Store

## Environment-Specific Files
- `.env.local`: Local development (API keys)
- `.env.example`: Template for required environment variables
