#!/usr/bin/env node
// Prepend a release URL to a package's `releases` array in source.json.
//
// Usage: node scripts/add-release.mjs <packageName> <releaseUrl>
//
// Idempotent: if the URL is already listed, exits 0 without writing.
// A package not yet in source.json is appended as a new entry; its name must
// start with the listing id (e.g. `vrchat.puetsuaworkshop.`).

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SOURCE_PATH = join(process.cwd(), 'source.json');

async function main() {
  const [, , packageName, releaseUrl] = process.argv;
  if (!packageName || !releaseUrl) {
    console.error('Usage: add-release.mjs <packageName> <releaseUrl>');
    process.exit(2);
  }

  const raw = await readFile(SOURCE_PATH, 'utf8');
  const source = JSON.parse(raw);

  let pkg = source.packages.find((p) => p.name === packageName);
  if (!pkg) {
    if (!packageName.startsWith(`${source.id}.`)) {
      console.error(`Package "${packageName}" must start with "${source.id}."`);
      process.exit(1);
    }
    pkg = { name: packageName, releases: [] };
    source.packages.push(pkg);
    console.log(`New package: ${packageName}`);
  }

  if (pkg.releases.includes(releaseUrl)) {
    console.log(`Release already listed; nothing to do: ${releaseUrl}`);
    return;
  }

  pkg.releases.unshift(releaseUrl);
  await writeFile(SOURCE_PATH, JSON.stringify(source, null, 2) + '\n');
  console.log(`Added: ${releaseUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
