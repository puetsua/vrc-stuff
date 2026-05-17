# Replace React frontend with static site + automated VPM manifest

**Date:** 2026-05-17
**Status:** Approved

## Background

This repo (`vrc-stuff`) serves the static site at `vrchat.puetsua.net` and a VPM (VRChat Package Manager) repository manifest at `https://vrchat.puetsua.net/vpm/vpm.json`. The manifest is consumed by VCC to distribute Unity packages — currently a single package, `vrchat.puetsuaworkshop.buttonwizard`.

Today's setup has two friction points:

1. **Manifest is hand-maintained.** Each new release requires copying `displayName`, `description`, `dependencies`, `vpmDependencies`, and the zip URL into `public/vpm/vpm.json`. The recent commit history (`c7e98d4 Added 0.5.1`, `9ef760d Fixed vpm.json`) shows this is a regular source of error.
2. **Frontend toolchain is overbuilt.** A React/Chakra/webpack stack renders two trivial pages: a landing with two buttons (`src/index.tsx`) and an "Add to VCC" deep-link page (`src/vpm.tsx`). The page logic could be plain HTML.

[`LastationVRChat/VPM`](https://github.com/LastationVRChat/VPM) demonstrates a better pattern: a short `source.json` listing only release URLs, and CI that downloads each zip, reads its embedded `package.json`, and generates the manifest. We're adopting that **pattern**, but implementing it with a ~150-line Node script instead of the template's Nuke + Scriban + downloaded C# project. We're also adopting the template's **listing UI** (Fluent UI web components), restyled in purple to match the existing visual identity.

## Goals

- Replace React/Chakra/webpack frontend with two static HTML pages.
- Replace hand-maintained `vpm.json` with a manifest generated at CI time from `source.json`.
- Preserve the public URL `https://vrchat.puetsua.net/vpm/vpm.json` so existing VCC subscribers keep working.
- Preserve visual identity: purple buttons, dark background, the two background images.
- Move deployment from local `gh-pages -d build` to GitHub Actions.

## Non-goals

- Adopting the `vrchat-community/package-list-action` (Nuke/Scriban) pipeline verbatim — we're reimplementing its core logic in Node for transparency and faster CI.
- Adding additional packages (`source.json` makes this easy later, but isn't part of this work).
- Implementing search, filtering, or any UI feature beyond what LastationVRChat's listing shows.
- Local-runnable dev server for the listing page. The listing is build-time rendered; for portal edits, opening `Website/index.html` in a browser works.

## Design

### Input: `source.json`

New top-level file. The only file edited when publishing a release.

```json
{
  "name": "Puetsua's VPM",
  "id": "vrchat.puetsuaworkshop",
  "url": "https://vrchat.puetsua.net/vpm/vpm.json",
  "author": { "name": "Puetsua", "url": "https://puetsua.booth.pm" },
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

The `url` field is a hard constraint: it MUST stay pinned to `https://vrchat.puetsua.net/vpm/vpm.json`. Changing it would invalidate every existing VCC subscriber.

### Repository layout

```
source.json                          ← input listing
CNAME                                ← vrchat.puetsua.net
scripts/
  build.mjs                          ← reads source.json → writes manifest + listing HTML
templates/
  listing.html                       ← HTML template with {{tokens}} the script substitutes
Website/                             ← deployed root (GitHub Pages serves this dir)
  index.html                         ← handmade portal page
  styles.css                         ← shared styles (portal + listing)
  background.png                     ← portal background
  vpm/
    bg2.png                          ← listing background
    (index.html, vpm.json, index.json — all generated at CI time)
.github/workflows/
  deploy.yml                         ← run build.mjs, deploy Website/ to Pages
docs/superpowers/specs/              ← this spec
.gitignore                           ← ignores generated files in Website/vpm/
```

### Portal page (`Website/index.html`)

Handmade static HTML. Visual parity with the current React landing page:

- Full-viewport `background.png` with a dark gradient overlay.
- Centered headline: "Puetsua's VRChat stuff".
- Two purple buttons: "Booth.pm" (external link to `https://puetsua.booth.pm`) and "VPM Repository" (`/vpm/`).
- No JavaScript. Framer Motion fade-in is **dropped** — page load is instant, animation isn't needed.

### Listing page (`Website/vpm/index.html`, generated)

Visual style adopted from `LastationVRChat/VPM`:

- **Framework:** Fluent UI web components, loaded from CDN. No build step for the components themselves — they're custom elements registered by the CDN script.
- **Theme:** restyled with purple accents (`#805AD5`-ish, matching current Chakra `colorScheme="purple"`) and dark background. CSS custom properties define the palette; we override Fluent's neutral and accent tokens.
- **Layout:** centered content max-width 1000px, package list with each package's `displayName`, `description`, version selector, and a per-version download link.
- **"Add to VCC" button** at the top, generating `vcc://vpm/addRepo?url=https://vrchat.puetsua.net/vpm/vpm.json` (same deep-link mechanism as today).
- **Back button** to `/` (preserves the current `/vpm` → `/` navigation pattern).
- **Background:** `bg2.png` with dark gradient overlay, matching the portal's visual treatment.
- Data is **baked in at build time** by `scripts/build.mjs` — no client-side fetch of `vpm.json` for rendering. The deployed HTML is fully self-contained.

### `scripts/build.mjs`

Single ~150-line Node 20 script. **Zero npm dependencies.** Uses Node built-ins (`fetch`, `fs`, `child_process`) and the `unzip` binary (preinstalled on `ubuntu-latest` GitHub runners).

Logic:

1. Read `source.json`.
2. Initialize manifest skeleton from `source.json`'s top-level fields (name, id, url, author, description).
3. For each package, for each release URL:
   - `fetch(url)` → write zip body to a temp file.
   - Run `unzip -p tempfile package.json` → capture stdout → `JSON.parse`.
   - Add entry to `manifest.packages[name].versions[version]` with the parsed metadata plus the original release URL.
4. Write `Website/vpm/vpm.json` and `Website/vpm/index.json` (identical content).
5. Read `templates/listing.html`. Substitute tokens:
   - `{{LISTING_NAME}}`, `{{LISTING_DESCRIPTION}}`, `{{LISTING_URL}}`, `{{AUTHOR_NAME}}`, `{{AUTHOR_URL}}` — from `source.json` top-level.
   - `{{PACKAGE_ROWS}}` — generated HTML for the package list, one section per package, with all versions.
6. Write to `Website/vpm/index.html`.

The script is fully runnable locally with `node scripts/build.mjs` — no Docker, no .NET SDK, no NuGet, no Nuke.

### Template substitution

We use plain string replacement, not a templating library. The script generates `{{PACKAGE_ROWS}}` by mapping over packages → versions and emitting a hand-written HTML string per row. This is intentional — for ~10 substitution points and one loop, a templating library is overkill.

### GitHub Actions workflow (`.github/workflows/deploy.yml`)

Triggers: push to `main`, `workflow_dispatch`.

Steps:
1. `actions/checkout@v4`.
2. `actions/setup-node@v4` with Node 20.
3. `node scripts/build.mjs` — generates `Website/vpm/{vpm.json, index.json, index.html}`.
4. `actions/configure-pages@v5`.
5. `actions/upload-pages-artifact@v3` with `path: Website`.
6. `actions/deploy-pages@v4`.

No caching needed — the build is sub-30-seconds.

### Files removed from the repo

The entire React/webpack stack:

- `src/` (all files)
- `public/` (contents reorganized into `Website/`; CNAME moves to top-level)
- `package.json`, `package-lock.json`, `node_modules/`
- `tsconfig.json`, `.babelrc`, `webpack.config.ts`
- `build/`

### Files added

- `source.json`
- `scripts/build.mjs`
- `templates/listing.html`
- `Website/index.html`
- `Website/styles.css`
- `Website/background.png` (moved from `src/background.png`)
- `Website/vpm/bg2.png` (moved from `src/bg2.png`)
- `.github/workflows/deploy.yml`

### Files modified

- `CLAUDE.md` — replace "edit `public/vpm/vpm.json`" with "edit `source.json`"; document the new flow.
- `README.md` — currently a single character; add a short "how to release" note.
- `.gitignore` — drop Node-related entries, add `Website/vpm/index.html`, `Website/vpm/vpm.json`, `Website/vpm/index.json`.

### Manual one-time step

**Switch GitHub Pages source.** Repo → Settings → Pages → Source: change from "Deploy from a branch (`gh-pages`)" to "**GitHub Actions**". After this switch, the `gh-pages` branch is no longer used and can be deleted. This is a UI-only change the repo owner does once. The implementation plan must include it as a checklist item.

## Release workflow (after adoption)

1. Cut a GitHub Release on the package source repo (e.g. `puetsua/VRCButtonWizard`) with a `*.zip` asset containing a valid `package.json`.
2. In this repo, append one URL to the matching `packages[*].releases` array in `source.json`.
3. Commit and push to `main`.
4. CI runs `build.mjs`, regenerates manifest and listing HTML, deploys to Pages.

## Risks

### Embedded `package.json` must be complete

`build.mjs` reads `displayName`, `description`, `dependencies`, `vpmDependencies` from each release zip's embedded `package.json`. The existing hand-written manifest has all those fields populated, which means the zip already contains them — every VPM-compliant package must. If the first CI run produces a thinner manifest than today's, the fix is on the package source side, not in this repo.

### URL stability

Double-writing `vpm.json` and `index.json` defends against URL drift. The `url` field inside `source.json` must stay at `https://vrchat.puetsua.net/vpm/vpm.json` — flagged as a hard constraint.

### Cutover risk

This is a full rewrite of the deployed site, not an incremental change. During the first CI run, the deployed site flips from React/`gh-pages` output to the new static HTML/`actions/deploy-pages` output. Mitigation:

- The current site keeps serving from the `gh-pages` branch until the manual Pages-source toggle is flipped. Test the first Action run with the toggle still on `gh-pages` (the deploy step will succeed but won't take effect publicly), inspect the artifact, then flip the toggle.

### `unzip` availability

`ubuntu-latest` GitHub runners ship with `unzip` preinstalled. If we ever switch to a different runner image (e.g. `ubuntu-minimal`), `unzip` may need installing. Not a concern today.

## Validation

After implementation, verify:

1. The Action run completes green.
2. `https://vrchat.puetsua.net/vpm/vpm.json` content matches (or improves on) the current hand-written manifest. Invariants: same `name`, `id`, `url`, same package versions, no missing `dependencies`/`vpmDependencies` entries.
3. `https://vrchat.puetsua.net/` renders the portal with both buttons.
4. `https://vrchat.puetsua.net/vpm/` renders the Fluent UI listing in purple theme, shows the buttonwizard package and its versions, and the "Add to VCC" button generates a `vcc://...` URL pointing at `vpm.json`.
5. Adding the repo to VCC fresh: the "Add to VCC" deep-link button must still resolve correctly.
