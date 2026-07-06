import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, '..');
const iconsDir = path.join(projectRoot, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const faviconSvg = readFileSync(path.join(projectRoot, 'public', 'favicon.svg'));
const ogSvg = readFileSync(path.join(root, 'og-cover.svg'));

const sizes = [16, 32, 180, 192, 512];

for (const size of sizes) {
  await sharp(faviconSvg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, `icon-${size}.png`));
  console.log(`icon-${size}.png`);
}

// Maskable icon needs safe-zone padding (~20%) so Android's mask doesn't clip the gem.
await sharp(faviconSvg, { density: 384 })
  .resize(320, 320)
  .extend({ top: 96, bottom: 96, left: 96, right: 96, background: '#160b28' })
  .png()
  .toFile(path.join(iconsDir, 'icon-512-maskable.png'));
console.log('icon-512-maskable.png');

await sharp(ogSvg).resize(1200, 630).png().toFile(path.join(iconsDir, 'og-cover.png'));
console.log('og-cover.png');
