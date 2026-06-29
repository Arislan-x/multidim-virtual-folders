# 开发与发布

这个文档给维护者和贡献者看。根目录 README 面向插件用户。

## 本地构建

```bash
npm install
npm run build
```

构建命令会生成 `main.js`。

本地测试时，将以下文件复制到 `.obsidian/plugins/multidim-virtual-folders/`：

- `manifest.json`
- `main.js`
- `styles.css`

## 发布到 GitHub

Release tag 必须和 `manifest.json`、`package.json` 中的版本一致。

示例：

```bash
git tag 0.1.0
git push origin 0.1.0
```

GitHub Release workflow 会构建插件并上传：

- `main.js`
- `manifest.json`
- `styles.css`
- `versions.json`

## 提交到 Obsidian 社区插件商店

Obsidian 社区插件通过 GitHub Release 分发，并通过 `obsidianmd/obsidian-releases` 仓库收录。

1. 发布一个 GitHub Release，tag 与 `manifest.json` 版本一致。
2. 确认 Release 包含 `main.js`、`manifest.json`、`styles.css`。
3. Fork `obsidianmd/obsidian-releases`。
4. 参考 `docs/community-plugin-entry.json`，在 `community-plugins.json` 中添加本插件。
5. 发起只修改 `community-plugins.json` 的 pull request。
6. 完成 Obsidian PR 模板中的检查项，等待审核。
