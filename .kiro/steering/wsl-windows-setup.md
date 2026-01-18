# WSL/Windows Hybrid Development Setup

## Environment Overview

This project runs in a hybrid environment:
- **Kiro CLI**: Runs in WSL (Linux environment)
- **Local Development**: Runs in Windows PowerShell
- **Shared Files**: Project files accessible from both environments

## Common Issues & Solutions

### Dependency Conflicts

**Problem**: Kiro CLI creates files that break linting due to missing dependencies or different Node.js environments.

**Solution**: Automatic hook runs after each agent execution to refresh dependencies.

### Manual Fix (if needed):
```powershell
# In Windows PowerShell - Complete fix for persistent issues
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
pnpm store prune  # Clear pnpm cache to prevent virtual store issues
pnpm install
pnpm lint
```

### Quick Fix Script:
```powershell
# Run the automated fix script
.\scripts\fix-dependencies.ps1
```

### Line Ending Issues

**Problem**: Git converts LF ↔ CRLF between WSL and Windows.

**Solution**: Configure Git to handle line endings consistently:
```bash
git config core.autocrlf true  # Windows
git config core.eol lf         # WSL
```

### Path Handling

**Windows**: `C:\Users\Itokoro\Phantom-Trail`
**WSL**: `/mnt/c/Users/Itokoro/Phantom-Trail`

Always use relative paths in scripts for cross-environment compatibility.

## Development Workflow

### Before Using Kiro CLI:
```powershell
# Ensure clean state (Windows PowerShell)
pnpm lint
pnpm build
npx tsc --noEmit
```

### After Kiro CLI Work:
The `fix-dependencies` hook automatically:
1. Removes corrupted node_modules
2. Reinstalls dependencies with pnpm
3. Ensures linting passes

### Manual Verification:
```powershell
# Verify everything works (Windows PowerShell)
pnpm lint && pnpm build && npx tsc --noEmit
```

## ESLint Configuration

Advanced feature files are temporarily excluded from strict linting:
- `lib/sync-manager.ts`
- `lib/conflict-resolver.ts` 
- `lib/storage-manager.ts`
- `lib/privacy-predictor.ts`
- `lib/cache-optimizer.ts`
- `lib/performance-monitor.ts`

This allows Kiro CLI to create experimental features without breaking the build.

## Troubleshooting

### If Dependencies Still Break:
1. Check if new files were created by Kiro CLI
2. Add them to the ESLint relaxed rules in `eslint.config.mjs`
3. Run `.\scripts\fix-dependencies.ps1` for complete cleanup
4. If issues persist, clear pnpm cache: `pnpm store prune`

### If Build Fails:
1. Ensure you're in Windows PowerShell (not WSL)
2. Check that pnpm is installed in Windows
3. Verify Node.js version compatibility

### If Kiro CLI Can't Access Files:
1. Ensure WSL can access Windows files: `/mnt/c/Users/...`
2. Check file permissions between environments
3. Use relative paths in all scripts

## Best Practices

1. **Always develop in Windows PowerShell** for consistency
2. **Let Kiro CLI handle its own environment** - don't mix commands
3. **Commit lockfile changes** when dependencies are updated
4. **Use the automatic hook** instead of manual fixes when possible
5. **Test in both environments** if making cross-platform changes

This setup ensures reliable development while leveraging both Kiro CLI's AI capabilities and Windows development tools.