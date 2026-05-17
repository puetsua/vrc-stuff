# VPM Template Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the React/Chakra/webpack frontend with a static HTML site whose VPM manifest is auto-generated at CI time from `source.json`, preserving the public manifest URL and visual identity.

**Architecture:** Static site served from GitHub Pages. A zero-dependency Node script (`scripts/build.mjs`) reads `source.json`, fetches each release zip, extracts the embedded `package.json`, assembles a VPM manifest, and renders a Fluent UI listing page from `templates/listing.html`. The portal page (`Website/index.html`) is handmade HTML. A single GitHub Actions workflow runs the script and deploys `Website/` via `actions/deploy-pages`.

**Tech Stack:** Static HTML/CSS, Fluent UI web components (CDN-loaded), Node 20 (CI-only), `unzip` (preinstalled on `ubuntu-latest`), GitHub Actions for Pages.

---

## File Structure

After this plan completes, the repo looks like this:

```
source.json                          ← package listing input (hand-edited)
CNAME                                ← vrchat.puetsua.net (moved to root)
scripts/
  build.mjs                          ← manifest + listing HTML generator
templates/
  listing.html                       ← Fluent UI listing template with {{tokens}}
Website/                             ← deploy root
  index.html                         ← portal page (handmade)
  styles.css                         ← shared styles
  background.png                     ← portal bg
  vpm/
    bg2.png                          ← listing bg
    (index.html, vpm.json, index.json — generated at CI time, gitignored)
.github/workflows/
  deploy.yml                         ← run build.mjs + deploy
docs/superpowers/
  specs/2026-05-17-vpm-template-adoption-design.md
  plans/2026-05-17-vpm-template-adoption.md (this file)
.gitignore                           ← ignores generated Website/vpm/ files
CLAUDE.md                            ← updated for new flow
README.md                            ← updated for new flow
```

**Removed:** `src/`, `public/`, `package.json`, `package-lock.json`, `tsconfig.json`, `.babelrc`, `webpack.config.ts`, `build/`, `node_modules/`.

**File responsibilities:**
- `source.json` — single source of truth for what packages and versions exist.
- `scripts/build.mjs` — pure transformation: source.json → manifest + rendered HTML. No state.
- `templates/listing.html` — visual structure of the listing page; data injected by build.mjs.
- `Website/index.html` — portal, completely independent of the listing pipeline.
- `Website/styles.css` — both pages share this. Single source of theme tokens (purple palette, fonts).
- `.github/workflows/deploy.yml` — orchestrates: checkout → run build.mjs → upload `Website/` → deploy Pages.

---

## Pre-flight

### Task 0: Snapshot current manifest for later comparison

We need a known-good reference to verify the generated manifest matches today's output.

**Files:**
- Read: `public/vpm/vpm.json`

- [ ] **Step 1: Save the current vpm.json content somewhere outside the repo for later diff**

Run:
```bash
cp public/vpm/vpm.json /tmp/vpm-baseline.json
```

(On Windows PowerShell: `Copy-Item public/vpm/vpm.json $env:TEMP/vpm-baseline.json`.)

This file will be diffed against the generated output in Task 7.

- [ ] **Step 2: Verify the working tree is clean**

Run:
```bash
git status
```

Expected: `nothing to commit, working tree clean` (or only this plan staged/committed).

If there are unstaged changes, stop and ask the user before proceeding.

---

## Task 1: Add static assets in Website/

Stage the static-site directory structure with the assets that don't depend on any build step. The React stack stays in place until Task 9.

**Files:**
- Create: `Website/background.png` (copy from `src/background.png`)
- Create: `Website/vpm/bg2.png` (copy from `src/bg2.png`)
- Create: `Website/.gitkeep` for empty dirs — NOT NEEDED (the pngs will keep the dirs)
- Modify: top-level `CNAME` (already exists with `vrchat.puetsua.net\nvrc.puetsua.net`)

- [ ] **Step 1: Create the Website directories and copy backgrounds**

Run:
```bash
mkdir -p Website/vpm
cp src/background.png Website/background.png
cp src/bg2.png Website/vpm/bg2.png
```

- [ ] **Step 2: Verify files exist**

Run:
```bash
ls Website Website/vpm
```

Expected output: `background.png  vpm` and `bg2.png`.

- [ ] **Step 3: Commit**

```bash
git add Website/background.png Website/vpm/bg2.png
git commit -m "chore: stage static-site backgrounds under Website/"
```

---

## Task 2: Write the portal page

Static HTML matching the current React landing visually: full-viewport background, dark gradient overlay, centered title, two purple buttons.

**Files:**
- Create: `Website/index.html`
- Create: `Website/styles.css`

- [ ] **Step 1: Create `Website/styles.css`**

```css
:root {
  color-scheme: dark;
  --accent: #805AD5;
  --accent-hover: #6B46C1;
  --accent-active: #553C9A;
  --bg: #000;
  --text: #fff;
  --text-muted: rgba(255, 255, 255, 0.7);
  --overlay: linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.4));
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

.page {
  min-height: 100vh;
  background-size: cover;
  background-position: center center;
  display: flex;
}

.page-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--overlay);
  padding: 1rem 2rem;
}

.page-content {
  max-width: 42rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
}

.headline {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

@media (min-width: 768px) {
  .headline { font-size: 3rem; }
}

.button-row {
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: var(--text);
  text-decoration: none;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: background 120ms ease;
}

.btn:hover { background: var(--accent-hover); }
.btn:active { background: var(--accent-active); }

.btn-icon {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: Create `Website/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Puetsua's VRChat stuff</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="page" style="background-image: url('background.png');">
    <div class="page-overlay">
      <div class="page-content">
        <h1 class="headline">Puetsua's VRChat stuff</h1>
        <div class="button-row">
          <a class="btn" href="https://puetsua.booth.pm" rel="noopener noreferrer" target="_blank">Booth.pm</a>
          <a class="btn" href="vpm/">VPM Repository</a>
        </div>
      </div>
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 3: Open the portal in a browser and verify it renders**

Run:
```bash
# from repo root
start Website/index.html   # Windows
# or: open Website/index.html on macOS, xdg-open on Linux
```

Expected: full-viewport `background.png`, dark overlay on the left, headline "Puetsua's VRChat stuff" in white, two purple buttons "Booth.pm" and "VPM Repository". Clicking "Booth.pm" opens booth.pm. Clicking "VPM Repository" tries to load `vpm/` (404 expected at this stage — the listing page doesn't exist yet).

- [ ] **Step 4: Commit**

```bash
git add Website/index.html Website/styles.css
git commit -m "feat: add static portal page"
```

---

## Task 3: Write the listing template

Handwritten HTML using Fluent UI web components loaded from a CDN. Tokens (`{{TOKEN_NAME}}`) get substituted by `build.mjs` at CI time.

**Files:**
- Create: `templates/listing.html`
- Modify: `Website/styles.css` (append listing-specific rules)

- [ ] **Step 1: Append listing-specific styles to `Website/styles.css`**

Edit `Website/styles.css` and append to the end:

```css
/* ─── Listing page (Website/vpm/) ─────────────────────────────── */

.listing-header {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 2rem auto;
}

.listing-header h1 {
  font-size: 2rem;
  margin: 0.5rem 0;
}

.listing-header p {
  color: var(--text-muted);
  margin: 0 0 1rem 0;
}

.listing-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem 2rem 4rem 2rem;
}

.back-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.add-vcc-row {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0 2rem 0;
  flex-wrap: wrap;
}

.add-vcc-row .vpm-url {
  flex: 1;
  min-width: 16rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text);
  border-radius: 0.375rem;
  font-family: monospace;
  font-size: 0.875rem;
}

.package-card {
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
}

.package-card h2 {
  font-size: 1.25rem;
  margin: 0 0 0.25rem 0;
}

.package-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 0.75rem 0;
}

.package-description {
  margin: 0 0 1rem 0;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.75rem;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0;
}

.version-tag {
  font-family: monospace;
  font-size: 0.9rem;
}

.version-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.875rem;
}

.version-link:hover { text-decoration: underline; }

footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  font-size: 0.875rem;
}

footer a { color: var(--accent); text-decoration: none; }
footer a:hover { text-decoration: underline; }
```

- [ ] **Step 2: Create `templates/listing.html`**

```bash
mkdir -p templates
```

Create `templates/listing.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{LISTING_NAME}}</title>
  <link rel="stylesheet" href="../styles.css" />
  <script type="module" src="https://unpkg.com/@fluentui/web-components"></script>
  <style>
    /* Page-specific overrides for the listing background */
    body { background-image: url('bg2.png'); background-size: cover; background-position: center center; }
    body::before {
      content: "";
      position: fixed; inset: 0;
      background: linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.4));
      z-index: -1;
    }
  </style>
</head>
<body>
  <div class="listing-content">
    <div class="back-row">
      <a class="btn btn-icon" href="../" aria-label="Back to portal">&larr;</a>
    </div>
    <header class="listing-header">
      <h1>{{LISTING_NAME}}</h1>
      <p>{{LISTING_DESCRIPTION}}</p>
      <div class="add-vcc-row">
        <a class="btn" href="vcc://vpm/addRepo?url={{LISTING_URL}}">Add to VCC</a>
        <input class="vpm-url" type="text" readonly value="{{LISTING_URL}}" onclick="this.select()" />
      </div>
    </header>
    <main>
      {{PACKAGE_ROWS}}
    </main>
    <footer>
      Maintained by <a href="{{AUTHOR_URL}}" rel="noopener noreferrer" target="_blank">{{AUTHOR_NAME}}</a>.
    </footer>
  </div>
</body>
</html>
```

Notes on Fluent UI: the `<script type="module" src="https://unpkg.com/@fluentui/web-components">` import is intentionally minimal. The current listing structure uses standard HTML elements styled via our CSS — Fluent UI is loaded so that future iterations can drop in `<fluent-button>`, `<fluent-card>` etc. without changing the build. The first version doesn't depend on Fluent UI rendering for correctness; the page works even if the CDN fails.

- [ ] **Step 3: Commit**

```bash
git add Website/styles.css templates/listing.html
git commit -m "feat: add listing page template and listing-specific styles"
```

---

## Task 4: Write source.json

Move from the embedded-metadata format of `public/vpm/vpm.json` to the URL-only format.

**Files:**
- Create: `source.json`

- [ ] **Step 1: Create `source.json`**

```json
{
  "name": "Puetsua's VPM",
  "id": "vrchat.puetsuaworkshop",
  "url": "https://vrchat.puetsua.net/vpm/vpm.json",
  "author": {
    "name": "Puetsua",
    "url": "https://puetsua.booth.pm"
  },
  "description": "VRChat packages by Puetsua",
  "packages": [
    {
      "name": "vrchat.puetsuaworkshop.buttonwizard",
      "releases": [
        "https://github.com/puetsua/VRCButtonWizard/releases/download/0.5.1/VRCButtonWizard-0.5.1.zip",
        "https://github.com/puetsua/VRCButtonWizard/releases/download/0.5.0/VRCButtonWizard-0.5.0.zip"
      ]
    }
  ]
}
```

- [ ] **Step 2: Verify it parses as JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('source.json'))"
```

Expected: no output (exit code 0). Errors mean invalid JSON.

- [ ] **Step 3: Commit**

```bash
git add source.json
git commit -m "feat: add source.json with current package releases"
```

---

## Task 5: Write the build script

Zero-dependency Node script that reads `source.json`, fetches each release zip, extracts `package.json` via `unzip -p`, assembles the manifest, and renders the listing HTML.

**Files:**
- Create: `scripts/build.mjs`

- [ ] **Step 1: Create `scripts/build.mjs`**

```bash
mkdir -p scripts
```

Create `scripts/build.mjs` with this content:

```javascript
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
      versions.sort((a, b) => (a.version < b.version ? 1 : -1));
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
```

- [ ] **Step 2: Verify Node syntax**

Run:
```bash
node --check scripts/build.mjs
```

Expected: no output (exit code 0). Syntax errors print here.

- [ ] **Step 3: Commit**

```bash
git add scripts/build.mjs
git commit -m "feat: add build.mjs to generate VPM manifest and listing HTML"
```

---

## Task 6: Run build.mjs locally and verify output

End-to-end smoke test of the build script before wiring up CI.

**Requirements:** Node 20+ and `unzip` on PATH. On Windows, run from Git Bash (which ships `unzip`) or WSL.

**Files:**
- Reads: `source.json`, `templates/listing.html`
- Writes: `Website/vpm/vpm.json`, `Website/vpm/index.json`, `Website/vpm/index.html`

- [ ] **Step 1: Run the build**

Run:
```bash
node scripts/build.mjs
```

Expected output:
```
  fetching https://github.com/puetsua/VRCButtonWizard/releases/download/0.5.1/VRCButtonWizard-0.5.1.zip
  fetching https://github.com/puetsua/VRCButtonWizard/releases/download/0.5.0/VRCButtonWizard-0.5.0.zip
  wrote .../Website/vpm/vpm.json and index.json
  wrote .../Website/vpm/index.html
done.
```

If `unzip: command not found` — install Git Bash on Windows, or run from WSL/Linux/macOS.

- [ ] **Step 2: Diff generated vpm.json against the baseline snapshot from Task 0**

Run:
```bash
diff /tmp/vpm-baseline.json Website/vpm/vpm.json
```

(Windows PowerShell: `Compare-Object (Get-Content $env:TEMP/vpm-baseline.json) (Get-Content Website/vpm/vpm.json)`.)

**Expected differences (acceptable):**
- Field ordering inside each version object may differ (the embedded `package.json` may list fields in a different order than the hand-written manifest did).
- Whitespace may differ slightly.

**Unexpected differences (must fix before continuing):**
- Missing versions, missing packages.
- Missing `displayName`, `description`, `dependencies`, or `vpmDependencies` on any version.
- Different `name`, `id`, or top-level `url`.

If unexpected differences appear, do NOT continue. The likely cause is that the embedded `package.json` inside the release zip is missing fields. That's a fix on the package source repo, not in this repo.

- [ ] **Step 3: Open the generated listing in a browser**

Run:
```bash
start Website/vpm/index.html   # Windows
# or: open Website/vpm/index.html on macOS, xdg-open on Linux
```

Expected:
- `bg2.png` shows as the background with a dark gradient overlay.
- Back arrow button (purple, top-left) — clicking it goes to `../` (the portal).
- Page title "Puetsua's VPM" and description.
- "Add to VCC" button (purple) plus a readonly text field showing `https://vrchat.puetsua.net/vpm/vpm.json`.
- One package card for `vrchat.puetsuaworkshop.buttonwizard` showing both 0.5.1 and 0.5.0 versions, each with a "Download" link to the GitHub release zip.
- Footer link "Maintained by Puetsua" → puetsua.booth.pm.

- [ ] **Step 4: Click the "Add to VCC" link to verify the URL is correct**

Right-click → Copy link. The href must be exactly: `vcc://vpm/addRepo?url=https%3A%2F%2Fvrchat.puetsua.net%2Fvpm%2Fvpm.json` (HTML-escaped colons/slashes) OR `vcc://vpm/addRepo?url=https://vrchat.puetsua.net/vpm/vpm.json` (literal). Either is acceptable — VCC handles both.

If the URL is anything else (especially if it points to localhost or to `index.json` instead of `vpm.json`), stop and inspect the rendering.

- [ ] **Step 5: Do NOT commit the generated files yet — they'll be gitignored in Task 9**

The generated files (`Website/vpm/index.html`, `vpm.json`, `index.json`) will be added to `.gitignore` in Task 9. Don't commit them now; if you accidentally staged them, unstage with `git restore --staged Website/vpm/index.html Website/vpm/vpm.json Website/vpm/index.json`.

---

## Task 7: Add the deploy workflow

GitHub Actions workflow that runs `build.mjs` and deploys `Website/` via Pages.

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow file**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate manifest and listing
        run: node scripts/build.mjs

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: Website

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow to build and deploy site"
```

Don't push yet — the workflow will fail until the Pages source is switched (Task 11).

---

## Task 8: Remove the old React/webpack stack

With the new pipeline in place, delete the entire React stack. The repo no longer needs Node-as-dependency at runtime — only at CI build time.

**Files:**
- Delete: `src/` (entire directory)
- Delete: `public/` (entire directory)
- Delete: `package.json`
- Delete: `package-lock.json`
- Delete: `tsconfig.json`
- Delete: `.babelrc`
- Delete: `webpack.config.ts`
- Delete: `build/` if present
- Delete: `node_modules/` if present

- [ ] **Step 1: Move root CNAME (the source-of-truth one for the new deploy)**

The current root `CNAME` lists `vrchat.puetsua.net` and `vrc.puetsua.net`. The deployed `CNAME` (under `public/CNAME`) lists only `vrchat.puetsua.net`. For Pages, only the file in the deploy root matters. We need a `CNAME` inside `Website/` that the deploy uploads.

Run:
```bash
cp CNAME Website/CNAME
cat Website/CNAME
```

Expected output:
```
vrchat.puetsua.net
vrc.puetsua.net
```

- [ ] **Step 2: Delete the old stack and the now-redundant root CNAME**

The root `CNAME` was only ever read by the old `gh-pages -d build` flow (after `copy-webpack-plugin` had already produced the deployed copy). Now that the deploy uploads `Website/`, the canonical CNAME lives at `Website/CNAME`. Delete the root one to avoid confusing future maintainers who might edit it expecting it to take effect.

Run (Bash):
```bash
rm -rf src public build node_modules
rm -f package.json package-lock.json tsconfig.json .babelrc webpack.config.ts CNAME
```

(PowerShell:
```powershell
Remove-Item -Recurse -Force src, public, build, node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package.json, package-lock.json, tsconfig.json, .babelrc, webpack.config.ts, CNAME -ErrorAction SilentlyContinue
```
)

- [ ] **Step 3: Verify the deletions**

Run:
```bash
ls
```

Expected top-level: `.git`, `.github`, `.gitignore`, `CLAUDE.md`, `docs`, `README.md`, `scripts`, `source.json`, `templates`, `Website`. No `src/`, no `public/`, no `package.json`, no root `CNAME` (it now lives at `Website/CNAME`).

- [ ] **Step 4: Stage deletions and the new Website/CNAME, then commit**

```bash
git add Website/CNAME
git add -u
git status
```

Verify the staged changes match expectations: deletion of `src/*`, `public/*`, `package.json`, `package-lock.json`, `tsconfig.json`, `.babelrc`, `webpack.config.ts`, root `CNAME`, plus the new `Website/CNAME`. Nothing else.

```bash
git commit -m "chore: remove React/webpack/Chakra stack — site is now static"
```

---

## Task 9: Update .gitignore

Strip out Node-specific entries that no longer apply; add the generated listing outputs.

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Read the current .gitignore**

Run:
```bash
cat .gitignore
```

(Note its current contents for reference.)

- [ ] **Step 2: Replace .gitignore with the new content**

Overwrite `.gitignore` with:

```
# Generated by scripts/build.mjs
Website/vpm/index.html
Website/vpm/vpm.json
Website/vpm/index.json

# Editor / OS
.DS_Store
Thumbs.db
.vscode/
.idea/
```

- [ ] **Step 3: Verify generated files are now ignored**

Run:
```bash
git status
```

Expected: the three files under `Website/vpm/` that build.mjs produced in Task 6 should NOT appear in the status (they're now ignored). Only `.gitignore` shows as modified.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: rewrite .gitignore for static-site layout"
```

---

## Task 10: Update CLAUDE.md and README.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Replace CLAUDE.md with the new content**

Overwrite `CLAUDE.md`:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

Static site at `vrchat.puetsua.net` that hosts a VPM (VRChat Package Manager) repository. The VPM manifest is consumed by VCC (VRChat Creator Companion) to distribute Unity packages (e.g. `vrchat.puetsuaworkshop.buttonwizard`).

## How it's built

This is a pure static site — no frontend framework, no bundler. Two pages:

- `/` — handwritten portal at `Website/index.html` with two links (Booth and VPM).
- `/vpm/` — listing page generated at CI time from `templates/listing.html`.

The VPM manifest at `/vpm/vpm.json` (and the duplicate at `/vpm/index.json`) is generated at CI time from `source.json` by `scripts/build.mjs`. The script reads each release URL listed in `source.json`, downloads the zip, extracts the embedded `package.json`, and assembles the manifest. No metadata is hand-maintained.

## Commands

- `node scripts/build.mjs` — regenerate `Website/vpm/{vpm.json, index.json, index.html}` from `source.json`. Requires Node 20+ and `unzip` on PATH (Git Bash works on Windows).
- Open `Website/index.html` directly in a browser to preview the portal.
- There's no dev server — CI does the build; locally just run the script and open the file.

## Publishing a new package version

1. Cut a GitHub Release on the package source repo (e.g. `puetsua/VRCButtonWizard`) with a `*.zip` asset containing a valid `package.json`.
2. Append the release URL to the matching `packages[*].releases` array in `source.json`.
3. Commit and push to `main`. CI runs `build.mjs` and deploys.

## Important constraints

- `source.json` → `url` field MUST stay `https://vrchat.puetsua.net/vpm/vpm.json`. That string is what existing VCC subscribers have stored. Changing it invalidates every subscription.
- `build.mjs` writes the manifest to BOTH `vpm.json` and `index.json`. Don't drop the `vpm.json` write — it's the legacy URL.

## Deployment

GitHub Actions → GitHub Pages via `actions/deploy-pages`. The deploy workflow is at `.github/workflows/deploy.yml`. Triggered on push to `main` and `workflow_dispatch`.

For this to work, repo Settings → Pages → Source must be set to "GitHub Actions" (not "Deploy from a branch").
```

- [ ] **Step 2: Replace README.md**

Overwrite `README.md`:

```markdown
# vrc-stuff

Static site hosting Puetsua's VRChat assets and a VPM repository at <https://vrchat.puetsua.net>.

## Publishing a new package version

1. Cut a GitHub Release on the package's source repo with a `*.zip` containing a valid `package.json`.
2. Append the release URL to the matching `packages[*].releases` array in `source.json`.
3. Commit and push. CI regenerates the manifest and redeploys.

## Local preview

```bash
node scripts/build.mjs
```

Then open `Website/index.html` in a browser. Requires Node 20+ and `unzip` on PATH.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: rewrite CLAUDE.md and README.md for new static-site flow"
```

---

## Task 11: Final cutover

Push everything, switch Pages source, verify the deploy.

**Manual UI step required.** This is the only step in the plan that the engineer cannot do from the terminal.

- [ ] **Step 1: Confirm the working tree state**

Run:
```bash
git log --oneline -15
git status
```

Expected: a clean working tree with a clear sequence of commits from Tasks 1–10. The most recent commits should cover: portal, template, source.json, build script, workflow, stack removal, gitignore, docs.

- [ ] **Step 2: Manual UI step — switch GitHub Pages source**

Open the repo on GitHub → **Settings → Pages** → **Source**.

If it currently reads "Deploy from a branch" → change to "**GitHub Actions**".

This must happen BEFORE the workflow runs successfully. If the workflow runs while the source is still on a branch, the `deploy-pages` step will fail with a permissions error.

**Note:** until this switch is flipped, the site continues to serve the last `gh-pages` branch state. There is no broken-site window during the transition.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Watch the Action run**

Open the repo → Actions tab → wait for the "Build and deploy" workflow to complete.

Expected: all steps green. The deploy step output includes a Pages URL.

If the deploy step fails with a permissions error, the manual step in Step 2 was missed.

If the build step fails with `unzip: command not found`, the runner image changed. Add a step before "Generate manifest" that installs unzip:

```yaml
      - name: Install unzip
        run: sudo apt-get update && sudo apt-get install -y unzip
```

- [ ] **Step 5: Verify the deployed site**

Open in a browser:

1. <https://vrchat.puetsua.net/> — portal renders with both buttons, the `background.png` background.
2. <https://vrchat.puetsua.net/vpm/> — listing renders with the purple theme, the package card, and the "Add to VCC" button.
3. <https://vrchat.puetsua.net/vpm/vpm.json> — JSON manifest loads in the browser. Diff against the baseline snapshot from Task 0 to confirm parity (allowing for field-order differences inside version objects).
4. Click "Add to VCC" → VCC should prompt to add `https://vrchat.puetsua.net/vpm/vpm.json` as a repo. If VCC is installed, the prompt confirms the URL.

- [ ] **Step 6: (Optional) Clean up the old gh-pages branch**

If the old `gh-pages` branch still exists, it's now orphaned. Delete only after Step 5 verification passes:

```bash
git push origin --delete gh-pages
```

If unsure, leave it — it doesn't cost anything to keep.

---

## Self-Review (run after all tasks complete)

Cross-check the spec's requirements against the plan:

**Spec coverage:**
- [x] `source.json` as input — Task 4
- [x] `scripts/build.mjs` generates manifest — Task 5
- [x] Manifest written to both `vpm.json` AND `index.json` — Task 5 (`build.mjs` step), Task 6 (verify)
- [x] Portal page handmade, two purple buttons — Task 2
- [x] Listing page Fluent UI styled in purple — Task 3
- [x] GitHub Actions workflow with Pages deploy — Task 7
- [x] Remove React/webpack/Chakra stack — Task 8
- [x] Manual Pages-source switch documented — Task 11 Step 2
- [x] CNAME preserved — Task 8 Step 1
- [x] CLAUDE.md and README.md updated — Task 10
- [x] .gitignore updated — Task 9
- [x] URL stability constraint enforced (build.mjs reads `source.json` `url` field as-is, source.json has correct URL) — Task 4 + Task 5

**No placeholders found.** Every code block contains complete code.

**Type/API consistency:** `build.mjs` references `templates/listing.html` (created in Task 3 before Task 5), `source.json` (created in Task 4 before Task 5), and writes to `Website/vpm/` (directory exists from Task 1). All cross-references resolve.

**One risk flagged in the spec not directly tested:** the spec's "embedded `package.json` must be complete" risk is checked by Task 6 Step 2's diff against the baseline. If the diff shows missing fields, the plan instructs the engineer to stop.
