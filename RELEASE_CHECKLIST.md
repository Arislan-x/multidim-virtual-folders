# Release Checklist

## Before The First GitHub Release

- [ ] Confirm `manifest.json` version matches `package.json`.
- [ ] Confirm `versions.json` contains the same version and minimum Obsidian version.
- [ ] Run `npm install`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Test the plugin in a local vault.
- [ ] Test drag-and-drop from the native file explorer.
- [ ] Test path rename/delete/subcategory/icon context menu actions.
- [ ] Test left sidebar, right sidebar, and both sidebars.
- [ ] Decide whether mobile is supported. If not tested, set `isDesktopOnly` to `true`.
- [ ] Replace `YOUR_GITHUB_USERNAME` placeholders in docs.
- [ ] Add screenshots or GIFs to the README if desired.

## GitHub Release

- [ ] Commit the source files.
- [ ] Push to GitHub.
- [ ] Create a tag named exactly like the version, for example `0.1.0`.
- [ ] Create a GitHub release from that tag.
- [ ] Attach `main.js`, `manifest.json`, and `styles.css` to the release.
- [ ] Confirm the release URL downloads all three files directly.

## Obsidian Community Plugin Submission

- [ ] Open the Obsidian Community developer dashboard.
- [ ] Sign in with the Obsidian account that will own the plugin listing.
- [ ] Connect the GitHub repository `Arislan-x/multidim-virtual-folders`.
- [ ] Select the latest GitHub release tag.
- [ ] Confirm the listing fields match `manifest.json` and `docs/community-plugin-entry.json`.
- [ ] Submit the plugin for review.
- [ ] Respond to review comments from the Obsidian team.
