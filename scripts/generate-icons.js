// Icon Generation Script using sharp
// Resizes logo.png to required Chrome extension icon sizes

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    // Try to import sharp
    const sharp = require('sharp');

    console.log('Generating extension icons from logo.png...');

    // Check if logo exists
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
    if (!fs.existsSync(logoPath)) {
      console.error('ERROR: assets/logo.png not found!');
      process.exit(1);
    }

    // Create icon directory
    const iconDir = path.join(__dirname, '..', 'public', 'icon');
    if (!fs.existsSync(iconDir)) {
      fs.mkdirSync(iconDir, { recursive: true });
      console.log('Created directory: public/icon');
    }

    // Required icon sizes for Chrome extensions
    const sizes = [16, 32, 48, 128];

    // Generate each size
    for (const size of sizes) {
      const outputPath = path.join(iconDir, `icon-${size}.png`);
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Created: icon-${size}.png`);
    }

    console.log('\nSUCCESS: All icons generated!');
    console.log('Icons saved to: public/icon/');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('\nERROR: sharp package not found!');
      console.log('\nPlease install sharp:');
      console.log('  pnpm add -D sharp');
      console.log('\nThen run this script again:');
      console.log('  node scripts/generate-icons.js');
      process.exit(1);
    } else {
      console.error('ERROR:', error.message);
      process.exit(1);
    }
  }
}

generateIcons();
