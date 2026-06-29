# Development

This document is for maintainers and contributors. The root README is written for plugin users.

## Local Build

```bash
npm install
npm run build
```

The build command generates `main.js`.

For local testing, copy these files into `.obsidian/plugins/multidim-virtual-folders/`:

- `manifest.json`
- `main.js`
- `styles.css`

## Release To GitHub

Release tags must match the version in `manifest.json` and `package.json`.

Example:

```bash
git tag 0.1.0
git push origin 0.1.0
```

The GitHub release workflow builds the plugin and uploads:

- `main.js`
- `manifest.json`
- `styles.css`
- `versions.json`

## Submit To The Obsidian Community Plugin Store

Obsidian community plugins are distributed through GitHub releases and listed through the `obsidianmd/obsidian-releases` repository.

1. Publish a GitHub release whose tag matches `manifest.json`.
2. Confirm the release includes `main.js`, `manifest.json`, and `styles.css`.
3. Fork `obsidianmd/obsidian-releases`.
4. Add this plugin to `community-plugins.json` using `docs/community-plugin-entry.json` as the template.
5. Open a pull request that only changes `community-plugins.json`.
6. Complete the Obsidian PR checklist and wait for review.
