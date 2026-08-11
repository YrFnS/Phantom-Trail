import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = join(projectRoot, 'assets', 'logo.png');
const iconDirectory = join(projectRoot, 'public', 'icon');
const iconSizes = [16, 32, 48, 128];

async function generateIcons() {
  if (!existsSync(logoPath)) {
    throw new Error(`Source logo was not found at ${logoPath}`);
  }

  mkdirSync(iconDirectory, { recursive: true });
  for (const size of iconSizes) {
    const outputPath = join(iconDirectory, `icon-${size}.png`);
    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);
    console.log(`Created ${outputPath}`);
  }
}

generateIcons().catch(error => {
  console.error(
    error instanceof Error ? error.message : 'Icon generation failed.'
  );
  process.exitCode = 1;
});
