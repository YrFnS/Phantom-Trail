# Dependency Management

## pnpm Best Practices

**Always Use pnpm** - This project is optimized for pnpm. Don't switch to npm/yarn.

**Lockfile is Sacred** - Never delete `pnpm-lock.yaml` unless absolutely necessary for corruption recovery.

**Commit Lockfile Changes** - Always commit `pnpm-lock.yaml` changes when adding/removing dependencies.

**Frozen Installs in CI** - Use `pnpm install --frozen-lockfile` in production/CI environments.

## WSL/Windows Hybrid Environment

**Development Setup**:
- **Kiro CLI**: Runs in WSL (Linux environment)
- **Local Commands**: Run in Windows PowerShell
- **Project Files**: Accessible from both environments

**Important Considerations**:
- Use PowerShell commands for local development tasks (pnpm, npm, git)
- Kiro CLI operates in WSL and may have different path handling
- Line endings: Git may convert LF ↔ CRLF between environments
- File permissions: WSL and Windows handle permissions differently
- Node modules: Install in Windows environment for local development

**Recommended Workflow**:
```bash
# Local development (Windows PowerShell)
pnpm install
pnpm dev
pnpm build
pnpm lint

# Kiro CLI operations (WSL)
# Kiro CLI handles its own environment automatically
```

**Path Handling**:
- Windows paths: `C:\Users\...\Phantom-Trail`
- WSL paths: `/mnt/c/Users/.../Phantom-Trail`
- Use relative paths in scripts for cross-environment compatibility

## Adding Dependencies

**Process for New Dependencies**:
1. Add dependency: `pnpm add package-name`
2. Verify build: `pnpm build`
3. Verify linting: `pnpm lint`
4. Verify types: `npx tsc --noEmit`
5. Test extension manually in Chrome
6. Commit both `package.json` and `pnpm-lock.yaml`

**Dev Dependencies**: Use `pnpm add -D package-name` for build tools, linters, etc.

**Peer Dependencies**: If warnings appear, install peer deps: `pnpm add peer-dep-name`

## Troubleshooting Dependency Issues

**If `pnpm lint` fails with "Cannot find package"**:
```bash
# Option 1: Reinstall (preferred)
pnpm install

# Option 2: Clear cache and reinstall (if Option 1 fails)
pnpm store prune
pnpm install

# Option 3: Nuclear option (last resort)
Remove-Item -Recurse -Force node_modules
Remove-Item -Force pnpm-lock.yaml
pnpm install
```

**If TypeScript fails with "tsc not found"**:
```bash
# Ensure TypeScript is installed
pnpm add -D typescript
```

**If permission errors on Windows**:
```bash
# Run PowerShell as Administrator, then:
Remove-Item -Recurse -Force node_modules
pnpm install
```

## Cache Management

**Regular Maintenance**:
```bash
# Clean unused packages (run monthly)
pnpm store prune

# Check store status
pnpm store status
```

**When to Clear Cache**:
- Weird dependency resolution errors
- Packages seem corrupted
- After major pnpm version updates

## Version Pinning

**Pin Critical Dependencies** - Use exact versions for:
- `wxt` (extension framework)
- `react` and `react-dom` (UI framework)
- `typescript` (type system)

**Allow Patch Updates** - Use `^` for most other dependencies to get security fixes.

**Example**:
```json
{
  "dependencies": {
    "wxt": "0.20.13",           // Exact version (critical)
    "react": "19.2.3",          // Exact version (critical)
    "chart.js": "^4.4.6"        // Allow patches (non-critical)
  }
}
```

## Dependency Audit

**Security Checks**:
```bash
# Check for vulnerabilities
pnpm audit

# Fix auto-fixable issues
pnpm audit --fix
```

**Bundle Size Monitoring**:
- Monitor build output size after adding dependencies
- Target: Keep total bundle under 1MB
- Use `pnpm build` to check bundle size

## Emergency Recovery

**If Everything Breaks**:
1. Backup your source code changes
2. Reset to last working commit: `git checkout HEAD~1`
3. Apply your changes manually
4. Test each step: lint → build → manual test
5. Commit working state

**Lockfile Corruption Signs**:
- "Cannot find package" errors for installed packages
- Build works but lint fails
- TypeScript can't find types that should exist
- Inconsistent behavior between developers

## Integration with Kiro CLI

**Before Using Kiro CLI for Features**:
```bash
# Ensure clean state
pnpm lint
pnpm build
npx tsc --noEmit
```

**After Kiro CLI Implementation**:
```bash
# Verify everything still works
pnpm install  # Refresh dependencies
pnpm lint     # Check code quality
pnpm build    # Verify build
git add .     # Stage all changes
git commit -m "feat: implement feature via kiro cli"
```

**If Kiro CLI Breaks Dependencies**:
1. Don't panic - this is recoverable
2. Check what changed: `git status`
3. If lockfile changed unexpectedly, restore it: `git checkout pnpm-lock.yaml`
4. Run `pnpm install` to regenerate properly
5. Test and commit

## Monitoring

**Daily Checks** (for active development):
- `pnpm lint` should always pass
- `pnpm build` should complete without errors
- Extension should load in Chrome without console errors

**Weekly Maintenance**:
- `pnpm store prune` to clean cache
- `pnpm audit` to check security
- Review bundle size trends

This approach ensures dependency stability while maintaining development velocity.