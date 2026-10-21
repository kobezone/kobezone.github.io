import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = join(homedir(), '.android');
const keystore = join(dir, 'debug.keystore');
if (existsSync(keystore)) {
  console.log('debug keystore already present');
  process.exit(0);
}
mkdirSync(dir, { recursive: true });
const result = spawnSync('keytool', [
  '-genkeypair', '-v',
  '-keystore', keystore,
  '-storepass', 'android',
  '-alias', 'androiddebugkey',
  '-keypass', 'android',
  '-keyalg', 'RSA',
  '-keysize', '2048',
  '-validity', '10000',
  '-dname', 'CN=Android Debug,O=Android,C=US'
], { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log('created debug keystore for sideload signing');
