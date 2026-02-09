/**
 * PWA 아이콘 생성 스크립트
 * sharp를 사용하여 192x192, 512x512 PNG 아이콘을 생성합니다.
 * 파란 배경(#2563eb)에 흰색 십자가 심볼
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

function createIconSVG(size) {
  const padding = Math.round(size * 0.15);
  const crossWidth = Math.round(size * 0.14);
  const cornerRadius = Math.round(size * 0.12);
  const center = size / 2;
  const armHalf = crossWidth / 2;

  const vTop = padding;
  const vBottom = size - padding;
  const vLeft = center - armHalf;

  const hLeft = padding;
  const hRight = size - padding;
  const hTop = center - armHalf;

  const r = Math.round(crossWidth * 0.15);

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#2563eb"/>
  <rect x="${vLeft}" y="${vTop}" width="${crossWidth}" height="${vBottom - vTop}" rx="${r}" fill="white"/>
  <rect x="${hLeft}" y="${hTop}" width="${hRight - hLeft}" height="${crossWidth}" rx="${r}" fill="white"/>
</svg>`;
}

async function generateIcon(size) {
  const svg = createIconSVG(size);
  const outputPath = path.join(publicDir, `icon-${size}.png`);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`Created: ${outputPath} (${size}x${size})`);
}

async function main() {
  console.log('Generating PWA icons...');
  await generateIcon(192);
  await generateIcon(512);
  console.log('Done!');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
