<p align="center">
  <img src="assets/logo.svg" alt="MultiDim Virtual Folders logo" width="120">
</p>

# MultiDim Virtual Folders

[中文说明](README.zh-CN.md)

MultiDim Virtual Folders is an Obsidian plugin for building multiple virtual folder trees from note frontmatter.

It lets you organize the same Markdown notes by date, project, source, topic, status, or any other custom dimension without moving real files in the vault.

## Features

- Create any number of virtual folder dimensions.
- Show each dimension in the left sidebar, right sidebar, or both.
- Switch dimensions from compact sidebar icons.
- Date dimensions can start from year, month, or day.
- Path dimensions support nested virtual folders from frontmatter paths.
- Create temporary virtual paths without creating real folders.
- Drag Markdown notes into virtual folders to update frontmatter.
- Rename folders/categories from the context menu.
- Change folder/category icons from the context menu.
- Delete virtual folders/categories without deleting real files.
- Sort each dimension by name, created time, or modified time.
- Choose ascending or descending order per dimension.
- Use Emoji or Lucide icons.
- Use Chinese or English interface text.

## Example

A note can contain frontmatter like this:

```yaml
---
catalog_date: 2026-06-29
project_path: Example Project/Phase One
source_path: Reference/Manual
---
```

The same note can then appear in several virtual folder trees:

- Date: `2026 / 2026-06 / 2026-06-29`
- Project: `Example Project / Phase One`
- Source: `Reference / Manual`

## Installation

### Obsidian Community Plugin Store

After the plugin is approved by the Obsidian community plugin review process:

1. Open Obsidian Settings.
2. Go to Community plugins.
3. Search for `MultiDim Virtual Folders`.
4. Install and enable the plugin.

### Offline Installation

Use this method when the target computer cannot access GitHub or the Obsidian community plugin store.

1. On a computer with internet access, download `multidim-virtual-folders.zip` from the [latest GitHub release](https://github.com/Arislan-x/multidim-virtual-folders/releases).
2. Copy the zip file to the offline computer.
3. Open the target vault folder and go to:

```text
.obsidian/plugins/
```

4. Extract `multidim-virtual-folders.zip` into that folder.
5. Confirm the files are in:

```text
.obsidian/plugins/multidim-virtual-folders/
```

6. Restart Obsidian or reload the app.
7. Open Settings -> Community plugins and enable `MultiDim Virtual Folders`.

### Manual Online Installation

1. Download `multidim-virtual-folders.zip` from the [latest GitHub release](https://github.com/Arislan-x/multidim-virtual-folders/releases).
2. Open your vault folder and go to:

```text
.obsidian/plugins/
```

3. Extract the zip file there.
4. Reload Obsidian.
5. Enable the plugin in Community plugins.

### BRAT Installation

Before community plugin approval, you can install the GitHub repository with BRAT:

```text
Arislan-x/multidim-virtual-folders
```

## Usage

Open the plugin from the ribbon icon or from the command palette.

In settings, create one or more virtual folder dimensions:

- Date dimension: groups notes by a date frontmatter property.
- Path dimension: groups notes by a path-like frontmatter property.

For each dimension, you can configure:

- Title
- Icon
- Color
- Frontmatter property
- Display side
- Sorting
- Write mode
- Temporary virtual paths

Most dimension settings are locked by default. Click `Edit`, change the values, then click `Save`.

## Drag And Drop

Drag a Markdown note into a virtual folder to write that folder path into the configured frontmatter property.

Only Markdown files are accepted. Real files are not moved.

## Mobile Support

The plugin is marked as mobile-compatible.

Sidebar browsing, dimension switching, settings, and frontmatter-based virtual folders can be used on mobile. Drag-and-drop behavior depends on the Obsidian mobile app and the operating system, so desktop remains the most complete experience for drag-and-drop workflows.

## Context Menu

Right-click a virtual folder/category to:

- Change icon
- Rename the folder/category
- Create a subcategory
- Delete the virtual folder/category

These actions update frontmatter and plugin settings only. They do not delete or move real files in your vault.

## Privacy

This plugin does not send data to external services.

It does not use telemetry, analytics, remote code loading, or external network requests.

All data stays in your local Obsidian vault and plugin settings.

## License

MIT License. See [LICENSE](LICENSE).
