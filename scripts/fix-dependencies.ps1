# Fix Dependencies Script for WSL/Windows Hybrid Environment
# Run this script when Kiro CLI creates files that break linting

Write-Host "🔧 Fixing dependencies after Kiro CLI work..." -ForegroundColor Cyan

# Remove potentially corrupted node_modules
if (Test-Path "node_modules") {
    Write-Host "📁 Removing node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}

# Clear pnpm cache to prevent virtual store issues
Write-Host "🧹 Clearing pnpm cache..." -ForegroundColor Yellow
pnpm store prune

# Reinstall dependencies
Write-Host "📦 Reinstalling dependencies..." -ForegroundColor Yellow
pnpm install

# Verify everything works
Write-Host "✅ Running verification tests..." -ForegroundColor Green
$lintResult = pnpm lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Linting failed. Check the output above for details." -ForegroundColor Red
    exit 1
}

$buildResult = pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Check the output above for details." -ForegroundColor Red
    exit 1
}

$typeResult = npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 All tests passed! Dependencies fixed successfully." -ForegroundColor Green
} else {
    Write-Host "❌ Type checking failed. Check the output above for details." -ForegroundColor Red
    exit 1
}