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
