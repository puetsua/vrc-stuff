# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

Static landing site for `vrchat.puetsua.net` that also hosts a VPM (VRChat Package Manager) repository. The VPM repo is consumed by VCC (VRChat Creator Companion) to distribute Unity packages (e.g. `vrchat.puetsuaworkshop.buttonwizard`).

## Commands

- `npm start` — webpack-dev-server on port 3000 (development build, auto-opens browser).
- `npm run build` — production build to `build/`.
- `npm run deploy` — publishes `build/` to GitHub Pages via the `gh-pages` branch.

No test runner is wired up; Jest/testing-library packages are present but there are no test files or `test` script.

## Architecture

Two independent React 18 SPAs share one webpack config (`webpack.config.ts`):

- `src/index.tsx` → emitted as `index.js` / `index.html` (landing page at `/`).
- `src/vpm.tsx` → emitted as `vpm.js` / `vpm/index.html` (the "Add to VCC" page at `/vpm`).

Each entry calls `ReactDOM.createRoot` directly — there is no router and no shared App component. New pages are added by registering another webpack entry + matching `HtmlWebpackPlugin` instance, not by adding a route.

`CopyWebpackPlugin` copies everything under `public/` into `build/` verbatim. This is how the VPM manifest is served:

- `public/vpm/vpm.json` → `https://vrchat.puetsua.net/vpm/vpm.json`

The "Add to VCC" button on `/vpm` builds a `vcc://vpm/addRepo?url=...` deep link from `document.baseURI` so the same code works in dev and prod.

### Updating the VPM repository

To publish a new package or version, edit `public/vpm/vpm.json` — add an entry under `packages.<id>.versions.<version>` with `version`, `name`, `displayName`, `description`, `dependencies`, `vpmDependencies`, and `url` (a GitHub Releases zip). The schema must match what VCC expects; existing entries are the reference. After editing, `npm run build && npm run deploy`.

### Styling

Chakra UI provides all components and theming; Framer Motion (`m.div`) wraps elements for fade-in animation. There is no CSS file — all styling is inline via Chakra props.

## Deployment

GitHub Pages, served from the `gh-pages` branch. `CNAME` files at the repo root and in `public/` both pin the custom domain (the one in `public/` is what actually ends up in `build/`).
