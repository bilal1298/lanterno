// Adds a content fingerprint to CSS/JS links (e.g. /styles.css?v=1a2b3c4d) so browsers and the CDN
// fetch the new file as soon as it changes. Run after editing styles.css, main.js or consent.js:
//   npm run stamp
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const assets = ['styles.css', 'main.js', 'consent.js'];
const pages = ['index.html', 'privacy/index.html'];

const version = Object.fromEntries(assets.map((file) => [
  file,
  createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8),
]));

for (const page of pages) {
  const before = readFileSync(page, 'utf8');
  let after = before;
  for (const file of assets) {
    const escaped = file.replace('.', '\\.');
    after = after.replace(new RegExp(`(["'])/${escaped}(\\?v=[0-9a-f]+)?\\1`, 'g'), `$1/${file}?v=${version[file]}$1`);
  }
  if (after !== before) writeFileSync(page, after);
  console.log(`${page}: ${after === before ? 'already up to date' : 'stamped'}`);
}
console.log(version);
