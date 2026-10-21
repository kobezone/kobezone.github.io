import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, '..', 'laotoule', 'icons', 'icon-512.png');
const res = join(root, 'android', 'app', 'src', 'main', 'res');
const legacy = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};
const foreground = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432
};
for (const [dir, size] of Object.entries(legacy)) {
  const folder = join(res, dir);
  await mkdir(folder, { recursive: true });
  const png = await sharp(src).resize(size, size).png().toBuffer();
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    await sharp(png).toFile(join(folder, name));
  }
}
for (const [dir, size] of Object.entries(foreground)) {
  const folder = join(res, dir);
  await mkdir(folder, { recursive: true });
  await sharp(src).resize(size, size, { fit: 'contain', background: { r: 232, g: 89, b: 12, alpha: 1 } }).png().toFile(join(folder, 'ic_launcher_foreground.png'));
}
const splashBg = { r: 255, g: 247, b: 230, alpha: 1 };
async function splashFiles(dir, found = []) {
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    if ((await stat(path)).isDirectory()) await splashFiles(path, found);
    else if (name === 'splash.png') found.push(path);
  }
  return found;
}
for (const file of await splashFiles(res)) {
  const { width, height } = await sharp(file).metadata();
  const side = Math.round(Math.min(width, height) * 0.42);
  const icon = await sharp(src).resize(side, side).png().toBuffer();
  await sharp({
    create: { width, height, channels: 4, background: splashBg }
  }).composite([{ input: icon, gravity: 'centre' }]).png().toFile(file);
}
console.log('wrote launcher icons and splash screens from laotoule/icons/icon-512.png');
