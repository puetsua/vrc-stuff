# Adopt LastationVRChat/VPM automation pattern

**Date:** 2026-05-17
**Status:** Approved

## Background

This repo (`vrc-stuff`) hosts the static site at `vrchat.puetsua.net` and serves a VPM (VRChat Package Manager) repository manifest at `https://vrchat.puetsua.net/vpm/vpm.json`. The manifest is consumed by VCC (VRChat Creator Companion) to distribute Unity packages — currently a single package, `vrchat.puetsuaworkshop.buttonwizard`.

Today the manifest is **hand-maintained**: every time a new release of a package ships, full metadata (`displayName`, `description`, `dependencies`, `vpmDependencies`, release zip URL) is manually copy-pasted into `public/vpm/vpm.json`. The recent commit history (`c7e98d4 Added 0.5.1`, `9ef760d Fixed vpm.json`) shows this is a regular source of friction and error.

The reference repo [`LastationVRChat/VPM`](https://github.com/LastationVRChat/VPM) uses the official `vrchat-community/package-list-action` pipeline (Nuke + Scriban templates) that takes a short `source.json` listing only release zip URLs, downloads each zip, parses the embedded `package.json`, and generates the full VPM manifest automatically.

We're adopting the **automation** from that template while keeping the existing React/Chakra UI for `/` and `/vpm`.

## Goals

- Replace hand-maintained `public/vpm/vpm.json` with an auto-generated manifest.
- Preserve the existing public manifest URL `https://vrchat.puetsua.net/vpm/vpm.json` so existing VCC subscribers continue working.
- Preserve the React landing page (`/`) and "Add to VCC" page (`/vpm`) verbatim.
- Move deployment from local `gh-pages -d build` to GitHub Actions.

## Non-goals

- Replacing the React UI with the template's generated HTML listing page.
- Removing Chakra, webpack, or any frontend dependency.
- Auto-creating GitHub releases or running CI on the package source repos.
- Adding additional packages — `source.json` makes that easy later, but isn't part of this work.
- Providing a local manifest-generation script (the action is the source of truth; if local preview is needed later, that can be a follow-up).

## Design

### Source of truth: `source.json`

New top-level `source.json`. This is the only file that changes when publishing a package version.

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

The `url` field MUST stay pinned to `https://vrchat.puetsua.net/vpm/vpm.json`. That string is how VCC identifies the repo; changing it would invalidate every existing subscriber.

### Build pipeline (GitHub Actions)

New workflow at `.github/workflows/deploy.yml`. Triggers: push to `main`, plus `workflow_dispatch` for manual rebuilds.

Steps:

1. **Checkout** this repo.
2. **Checkout** `vrchat-community/package-list-action` into `./ci`.
3. **Restore cache** for `ci/.nuke/temp` and `~/.nuget/packages` (mirrors template).
4. **Generate manifest** — run the Nuke task with `--list-publish-directory` pointing to a staging directory `./vpm-build/`. After this step, `vpm-build/index.json` exists.
5. **Stage manifest into public/** — copy `vpm-build/index.json` to **both** `public/vpm/vpm.json` and `public/vpm/index.json`. Two filenames, identical content:
   - `vpm.json` preserves the legacy subscriber URL.
   - `index.json` matches the template's convention for any new subscriber who copies an `index.json`-style URL.
6. **Setup Node**, `npm ci`, `npm run build` — webpack produces `build/` containing the React app plus the manifest JSON (`CopyWebpackPlugin` already copies `public/`).
7. **Setup Pages**, **Upload artifact** (`build/`), **Deploy to Pages**.

### Files changed

| Action | Path | Notes |
|---|---|---|
| Add | `source.json` | Input listing, hand-edited |
| Add | `.github/workflows/deploy.yml` | The pipeline above |
| Remove from git | `public/vpm/vpm.json` | Now a build artifact |
| Update | `.gitignore` | Add `public/vpm/vpm.json`, `public/vpm/index.json`, `vpm-build/`, `ci/` |
| Update | `package.json` | Keep `deploy` script as a documented local fallback (see below) |
| Update | `CLAUDE.md` | Replace "edit `public/vpm/vpm.json`" instructions with "edit `source.json`" |
| Update | `README.md` | Currently empty; add minimal "how to release" note |

Nothing in `src/` changes.

### Local fallback (kept, not removed)

The existing `npm run deploy` script (`gh-pages -d build`) is kept as an emergency manual deploy path, but it now requires the developer to first generate the manifest. Documented in README. v1 doesn't provide a local manifest generator — if someone needs to deploy manually before the CI is set up, they can paste output from a CI run.

### Manual one-time setup (cannot be automated)

Repo → Settings → Pages → **Source: GitHub Actions** (currently "Deploy from a branch: gh-pages"). After this change, the `gh-pages` branch is no longer used. This is a UI-only change the repo owner does once. The spec calls it out; implementation plan must include a checklist item.

### Release workflow (after adoption)

1. Cut a GitHub Release on the package source repo (e.g. `puetsua/VRCButtonWizard`) with a `*.zip` asset containing a valid `package.json`.
2. In this repo, append one URL to the matching `packages[*].releases` array in `source.json`.
3. Commit and push to `main`.
4. CI runs, regenerates the manifest, deploys to Pages.

## Risks

### Embedded `package.json` must be complete

The action reads `displayName`, `description`, `dependencies`, `vpmDependencies` from the **`package.json` embedded inside each release zip**. The existing manifest has all those fields populated, which means the zip already contains them — every VPM-compliant package must. If the first CI run produces a thinner manifest than today's hand-written one, the fix is on the package source side (add fields to its `package.json`), not in this repo.

### URL stability

The plan double-writes `vpm.json` and `index.json` to defend against URL drift. If the `url` field inside `source.json` is ever changed away from `https://vrchat.puetsua.net/vpm/vpm.json`, every existing VCC subscriber breaks silently. The spec marks this as a hard constraint.

### Pages source switch

Switching from `gh-pages` branch deployment to Actions deployment is irreversible without a UI toggle. If the Action fails on first run, the site continues serving the last `gh-pages` branch state — there is no broken-site risk during transition, but the first CI run must succeed before the manual Pages-source switch is flipped.

## Validation

After implementation, verify by:

1. Pushing the new workflow and confirming the Action run completes green.
2. Inspecting the deployed `https://vrchat.puetsua.net/vpm/vpm.json` — content must match (or improve on) the current hand-written manifest. Key invariants: same `name`, `id`, `url`, same package versions, no missing `dependencies`/`vpmDependencies` entries.
3. Opening `https://vrchat.puetsua.net/` and `https://vrchat.puetsua.net/vpm/` in a browser — React pages render unchanged.
4. Adding the repo to VCC fresh: the "Add to VCC" deep-link button must still resolve correctly.
