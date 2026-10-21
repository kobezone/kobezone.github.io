import { cp, rm, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, '..', 'laotoule');
const to = join(root, 'www');
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
console.log('copied laotoule/ -> _laotoule_apk/www/');
