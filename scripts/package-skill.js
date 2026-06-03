// Package html2ppt as an Anthropic-format skill.zip
// Structure: html2ppt.zip → html2ppt/SKILL.md + src/ + scripts/ + package.json
import { createWriteStream } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const dest = join(root, 'html2ppt-skill.zip');

const skillName = 'html2ppt';

console.log(`Creating ${dest}...`);

const output = createWriteStream(dest);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeBytes = archive.pointer();
  console.log(`Done: ${dest} (${(sizeBytes / 1024).toFixed(1)} KB)`);
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);

// 1. SKILL.md (required — Anthropic skill manifest)
archive.file(join(root, 'SKILL.md'), { name: `${skillName}/SKILL.md` });

// 2. src/ — all runtime conversion modules
archive.directory(join(root, 'src'), `${skillName}/src`);

// 3. scripts/ — CI/QA/dev tools (exclude this script itself)
archive.directory(join(root, 'scripts'), `${skillName}/scripts`, entry => entry.name !== 'package-skill.js');

// 4. package.json — dependency metadata
archive.file(join(root, 'package.json'), { name: `${skillName}/package.json` });

await archive.finalize();
