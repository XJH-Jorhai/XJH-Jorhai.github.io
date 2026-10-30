import sharp from 'sharp';

// Seeded, non-animated monochrome noise; no image processing of project photos.
const size = 256;
const pixels = Buffer.alloc(size * size);
let seed = 73129;
for (let i = 0; i < pixels.length; i++) {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  pixels[i] = (seed >>> 0) & 255;
}
await sharp(pixels, { raw: { width: size, height: size, channels: 1 } })
  .png().toFile('public/media/mineral-dither.png');
