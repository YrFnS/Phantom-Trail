# PowerShell script for formatting and linting files after write operations

param(
    [Parameter(ValueFromPipeline=$true)]
    [string]$HookEvent
)

try {
    # Parse the hook event JSON to extract file path
    $hookData = $HookEvent | ConvertFrom-Json -ErrorAction SilentlyContinue
    $filePath = $hookData.tool_input.path

    if (-not $filePath) {
        Write-Host "No file path found in hook event" -ForegroundColor Yellow
        exit 0
    }

    # Check if it's a TypeScript/JavaScript file
    if ($filePath -match '\.(ts|tsx|js|jsx)$') {
        Write-Host "Formatting and linting $filePath..." -ForegroundColor Cyan
        
        # Run prettier on the specific file
        try {
            pnpm exec prettier --write $filePath 2>$null
            Write-Host "✓ Formatting completed" -ForegroundColor Green
        } catch {
            Write-Host "⚠ Formatting had issues" -ForegroundColor Yellow
        }
        
        # Run lint with fix on the specific file
        try {
            pnpm exec eslint --fix $filePath 2>$null
            Write-Host "✓ Linting completed" -ForegroundColor Green
        } catch {
            Write-Host "⚠ Linting had issues" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Hook execution error: $($_.Exception.Message)" -ForegroundColor Red
}

exit 0