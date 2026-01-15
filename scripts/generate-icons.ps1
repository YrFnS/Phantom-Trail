# Icon Generation Script
# Resizes logo.png to required Chrome extension icon sizes

Write-Host "Generating extension icons from logo.png..." -ForegroundColor Cyan

# Check if logo exists
if (!(Test-Path "assets\logo.png")) {
    Write-Host "ERROR: assets\logo.png not found!" -ForegroundColor Red
    exit 1
}

# Create icon directory
$iconDir = "public\icon"
if (!(Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
    Write-Host "Created directory: $iconDir" -ForegroundColor Green
}

# Required icon sizes for Chrome extensions
$sizes = @(16, 32, 48, 128)

# Check if ImageMagick is available
$hasImageMagick = Get-Command magick -ErrorAction SilentlyContinue

if ($hasImageMagick) {
    Write-Host "Using ImageMagick to resize icons..." -ForegroundColor Yellow
    
    foreach ($size in $sizes) {
        $outputPath = "$iconDir\icon-$size.png"
        magick convert "assets\logo.png" -resize "${size}x${size}" $outputPath
        Write-Host "Created: icon-$size.png" -ForegroundColor Green
    }
    
    Write-Host "SUCCESS: All icons generated!" -ForegroundColor Green
} else {
    Write-Host "ImageMagick not found. Please install it or resize manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install ImageMagick" -ForegroundColor Cyan
    Write-Host "  Download from: https://imagemagick.org/script/download.php" -ForegroundColor White
    Write-Host "  Then run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Use online tool" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://www.iloveimg.com/resize-image" -ForegroundColor White
    Write-Host "  2. Upload assets\logo.png" -ForegroundColor White
    Write-Host "  3. Resize to: 16x16, 32x32, 48x48, 128x128" -ForegroundColor White
    Write-Host "  4. Save as: icon-16.png, icon-32.png, icon-48.png, icon-128.png" -ForegroundColor White
    Write-Host "  5. Place in: public\icon\" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3: Use Node.js sharp package" -ForegroundColor Cyan
    Write-Host "  Run: pnpm add -D sharp" -ForegroundColor White
    Write-Host "  Then use the Node.js script (generate-icons.js)" -ForegroundColor White
    
    exit 1
}