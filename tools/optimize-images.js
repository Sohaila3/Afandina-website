const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'assets', 'images', 'logo');
const outDir = path.join(srcDir, 'opt');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const images = [
  'car1',
  'car2',
  'car3',
  'found-us'
];

const sizes = [320, 720, 1280];

async function processImage(name) {
  const candidates = ['.webp', '.jpg', '.jpeg', '.png'];
  let srcPath = null;
  for (const ext of candidates) {
    const p = path.join(srcDir, `${name}${ext}`);
    if (fs.existsSync(p)) {
      srcPath = p;
      break;
    }
  }
  if (!srcPath) {
    console.warn(`Source not found for ${name}`);
    return;
  }

  const baseOut = path.join(outDir, name);

  // generate LQIP (small blurred placeholder)
  const lqipPath = `${baseOut}-lqip.webp`;
  await sharp(srcPath)
    .resize(40)
    .blur(1)
    .toFormat('webp', { quality: 30 })
    .toFile(lqipPath);

  // generate responsive webp sizes
  for (const w of sizes) {
    const out = `${baseOut}-${w}.webp`;
    await sharp(srcPath)
      .resize(w)
      .jpeg({ mozjpeg: true })
      .toFormat('webp', { quality: 70 })
      .toFile(out);
  }

  // generate avif versions for modern browsers
  for (const w of sizes) {
    const out = `${baseOut}-${w}.avif`;
    await sharp(srcPath)
      .resize(w)
      .toFormat('avif', { quality: 50 })
      .toFile(out);
  }

  console.log(`Processed ${name}`);
}

async function run() {
  for (const name of images) {
    try {
      await processImage(name);
    } catch (e) {
      console.error(`Failed ${name}:`, e.message || e);
    }
  }
  console.log('All done. Output folder: ' + outDir);
}

run();
