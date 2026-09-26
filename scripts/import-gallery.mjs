#!/usr/bin/env node
/**
 * Prepare studio photos for the gallery.
 *
 *   1. Drop your photos into  photos-in/
 *   2. npm run gallery:import
 *
 * Each file is rotated upright, cropped to the portrait shape the accordion
 * panels use, resized, compressed, and written to public/gallery/. The console
 * then prints the `gallery.items` block to paste into content/site.ts.
 *
 * WHY THIS EXISTS RATHER THAN "just copy the files in":
 *
 *   • EXIF IS STRIPPED. A phone photo taken in the studio carries GPS
 *     coordinates, the device model, and the capture timestamp. Publishing that
 *     on a children's art school's website hands out the exact address of a
 *     place full of kids. This is the single most important thing the script
 *     does, and it is silent if you do it by hand.
 *
 *   • ORIENTATION IS BAKED IN. Phones store the picture sideways plus an
 *     "rotate me" EXIF flag. Strip the EXIF without applying it first and every
 *     portrait photo publishes on its side.
 *
 *   • WEIGHT. A 5 MB camera original is ~40x heavier than it needs to be at the
 *     size these panels actually render.
 */
import { readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const IN_DIR = 'photos-in';
const OUT_DIR = join('public', 'gallery');

/**
 * Portrait: the panels are tall and narrow until one is opened. An opened
 * panel is up to ~600 CSS px wide, i.e. ~1200 device pixels on a phone or
 * Retina screen — at 900×1200 the photos were visibly soft there.
 */
const TARGET_W = 1200;
const TARGET_H = 1600;

if (!existsSync(IN_DIR)) {
  mkdirSync(IN_DIR, { recursive: true });
  console.log(`Created ${IN_DIR}/ — put your photos there and run this again.`);
  process.exit(0);
}

const files = readdirSync(IN_DIR)
  .filter((f) => ['.jpg', '.jpeg', '.png', '.webp', '.heic'].includes(extname(f).toLowerCase()))
  .sort();

if (files.length === 0) {
  console.log(`No images found in ${IN_DIR}/. Supported: jpg, png, webp, heic.`);
  process.exit(0);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

/*
 * Pillow does the work. It ships with this project's Python and handles EXIF
 * orientation and stripping correctly, which is the part that matters.
 */
const python = `
import sys, os
from PIL import Image, ImageOps

src, dst, W, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src)

# Apply the EXIF rotation flag, THEN drop the metadata. Order matters: reversed,
# every phone portrait ends up sideways.
im = ImageOps.exif_transpose(im)
im = im.convert('RGB')

# A source smaller than the target would only be blown up (blurry, no new
# detail). Crop to the aspect at its own size instead, and say so.
scale = min(im.width / W, im.height / H)
if scale < 1:
    W, H = int(W * scale), int(H * scale)
    print(f'WARN {src}: only {im.width}x{im.height}, kept at {W}x{H} — send the original photo, not a messenger copy', file=sys.stderr)

# Cover-crop to the target aspect, centred — same framing rule the CSS uses.
im = ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(0.5, 0.4))

# save() without an exif= argument writes no metadata at all: no GPS, no device.
# q88 + 4:4:4 chroma: q82 with default 4:2:0 subsampling smeared fine brush
# strokes and coloured edges, which is exactly what a painting gallery shows.
im.save(dst, 'JPEG', quality=88, optimize=True, progressive=True, subsampling=0)
print(os.path.getsize(dst))
`;

console.log(`Importing ${files.length} photo(s) -> ${OUT_DIR}/\n`);

const items = [];
let totalIn = 0;
let totalOut = 0;

files.forEach((file, i) => {
  const index = i + 1;
  const outName = `photo-${String(index).padStart(2, '0')}.jpg`;
  const inPath = join(IN_DIR, file);
  const outPath = join(OUT_DIR, outName);

  const result = spawnSync('python', ['-c', python, inPath, outPath, String(TARGET_W), String(TARGET_H)], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.error(`  FAILED  ${file}`);
    console.error((result.stderr || '').trim().split('\n').slice(-3).join('\n'));
    return;
  }

  if (result.stderr && result.stderr.includes('WARN')) console.warn(`  ${result.stderr.trim()}`);

  const inSize = statSync(inPath).size;
  const outSize = Number((result.stdout || '0').trim());
  totalIn += inSize;
  totalOut += outSize;

  console.log(
    `  ${basename(file).slice(0, 34).padEnd(34)} ${(inSize / 1048576).toFixed(1)} MB -> ${(outSize / 1024).toFixed(0)} KB   ${outName}`,
  );

  items.push({ src: `/gallery/${outName}`, from: file });
});

if (items.length === 0) process.exit(1);

console.log(
  `\nTotal: ${(totalIn / 1048576).toFixed(1)} MB -> ${(totalOut / 1024).toFixed(0)} KB, EXIF removed from all.\n`,
);

console.log('Paste into `gallery.items` in src/content/site.ts, then write a real');
console.log('caption for each — the caption is ALSO the alt text, so it is what a');
console.log('screen reader reads and what image search indexes. Describe the actual');
console.log('picture ("Натюрморт с грушами, акварель · 9 лет"), never "фото 1".\n');
console.log('  items: [');
for (const item of items) {
  console.log(`    { caption: 'ОПИШИТЕ: ${item.from}', image: '${item.src}' },`);
}
console.log('  ],');
