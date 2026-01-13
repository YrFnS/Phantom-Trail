# Dependency Verification Script
# Run this after adding dependencies or using Kiro CLI

Write-Host "Verifying project dependencies and build..." -ForegroundColor Cyan

# Check if pnpm is available
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pnpm not found. Please install pnpm first." -ForegroundColor Red
    exit 1
}

# Step 1: Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Dependency installation failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Lint check
Write-Host "Running lint check..." -ForegroundColor Yellow
pnpm lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Lint check failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Type check
Write-Host "Running TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: TypeScript check failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Build check
Write-Host "Running build..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: All checks passed! Project is ready." -ForegroundColor Green
if (Test-Path .output/chrome-mv3) {
    $bundleSize = (Get-ChildItem .output/chrome-mv3 -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    $bundleSizeRounded = [math]::Round($bundleSize, 2)
    Write-Host "Bundle size: $bundleSizeRounded MB" -ForegroundColor Cyan
}