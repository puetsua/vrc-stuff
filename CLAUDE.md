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
