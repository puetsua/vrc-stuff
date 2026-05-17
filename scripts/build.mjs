#!/usr/bin/env node
// Build the VPM manifest and listing HTML from source.json.
//
// Inputs:
//   - source.json           (list of packages and their release URLs)
//   - templates/listing.html (HTML template with {{TOKEN}} placeholders)
//
// Outputs (under Website/vpm/):
//   - vpm.json     (full VPM manifest, legacy URL)
//   - index.json   (identical content, conventional URL)
//   - index.html   (rendered listing page)
//
// Requirements:
//   - Node 20+
//   - `unzip` on PATH (preinstalled on ubuntu-latest runners and in Git Bash)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const ROOT = process.cwd();
const SOURCE_PATH = join(ROOT, 'source.json');
const TEMPLATE_PATH = join(ROOT, 'templates', 'listing.html');
const OUT_DIR = join(ROOT, 'Website', 'vpm');

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );

const compareVersionsDesc = (a, b) => {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pb[i] || 0) - (pa[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

async function fetchZipToTemp(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${resp.status}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  const tmpPath = join(tmpdir(), `vpm-${randomBytes(8).toString('hex')}.zip`);
  await writeFile(tmpPath, buf);
  return tmpPath;
}

function extractPackageJson(zipPath) {
  const stdout = execFileSync('unzip', ['-p', zipPath, 'package.json'], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function main() {
  const source = JSON.parse(await readFile(SOURCE_PATH, 'utf8'));

  const manifest = {
    name: source.name,
    id: source.id,
    url: source.url,
    author: source.author.name,
    packages: {},
  };

  for (const pkg of source.packages) {
    manifest.packages[pkg.name] = { versions: {} };
    for (const releaseUrl of pkg.releases) {
      console.log(`  fetching ${releaseUrl}`);
      const zipPath = await fetchZipToTemp(releaseUrl);
      const pkgJson = extractPackageJson(zipPath);
      if (!pkgJson.version) {
        throw new Error(`package.json in ${releaseUrl} is missing required "version" field`);
      }
      manifest.packages[pkg.name].versions[pkgJson.version] = {
        ...pkgJson,
        url: releaseUrl,
      };
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  const manifestJson = JSON.stringify(manifest, null, 2);
  await writeFile(join(OUT_DIR, 'vpm.json'), manifestJson);
  await writeFile(join(OUT_DIR, 'index.json'), manifestJson);
  console.log(`  wrote ${OUT_DIR}/vpm.json and index.json`);

  const template = await readFile(TEMPLATE_PATH, 'utf8');
  const packageRows = source.packages
    .map((pkg) => {
      const versions = Object.values(manifest.packages[pkg.name].versions);
      versions.sort((a, b) => compareVersionsDesc(a.version, b.version));
      const latest = versions[0];
      const versionRows = versions
        .map(
          (v) =>
            `        <div class="version-row"><span class="version-tag">${escapeHtml(v.version)}</span><a class="version-link" href="${escapeHtml(v.url)}">Download</a></div>`,
        )
        .join('\n');
      return [
        '      <article class="package-card">',
        `        <h2>${escapeHtml(latest.displayName || pkg.name)}</h2>`,
        `        <p class="package-id">${escapeHtml(pkg.name)}</p>`,
        `        <p class="package-description">${escapeHtml(latest.description || '')}</p>`,
        '        <div class="version-list">',
        versionRows,
        '        </div>',
        '      </article>',
      ].join('\n');
    })
    .join('\n');

  const rendered = template
    .replaceAll('{{LISTING_NAME}}', escapeHtml(source.name))
    .replaceAll('{{LISTING_DESCRIPTION}}', escapeHtml(source.description || ''))
    .replaceAll('{{LISTING_URL}}', escapeHtml(source.url))
    .replaceAll('{{AUTHOR_NAME}}', escapeHtml(source.author.name))
    .replaceAll('{{AUTHOR_URL}}', escapeHtml(source.author.url))
    .replaceAll('{{PACKAGE_ROWS}}', packageRows);

  await writeFile(join(OUT_DIR, 'index.html'), rendered);
  console.log(`  wrote ${OUT_DIR}/index.html`);
  console.log('done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
