// Sol Corona: Vice Coast - Make.fun Entrypoint (Node 22 Standard Library)
// Copies game/ and screenshots/ to /output (or MAKEFUN_OUTPUT_DIR) and writes dossier.json.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// 1. Ensure target directory structure exists
mkdirSync(outputDir, { recursive: true });

// 2. Deterministically copy game static files
const outGameDir = join(outputDir, 'game');
mkdirSync(outGameDir, { recursive: true });
cpSync(join(rootDir, 'game'), outGameDir, { recursive: true });

// 3. Copy genuine browser screenshots
const outScreenshotsDir = join(outputDir, 'screenshots');
mkdirSync(outScreenshotsDir, { recursive: true });
const srcScreenshotsDir = join(rootDir, 'screenshots');
if (existsSync(srcScreenshotsDir)) {
  cpSync(srcScreenshotsDir, outScreenshotsDir, { recursive: true });
}

// 4. Build official canonical dossier JSON
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
console.log(`Successfully built Sol Corona: Vice Coast into ${outputDir}`);
