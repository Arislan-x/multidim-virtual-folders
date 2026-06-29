<p align="center">
  <img src="assets/logo.svg" alt="MultiDim Virtual Folders logo" width="120">
</p>

# MultiDim Virtual Folders

[English README](README.md)

MultiDim Virtual Folders 是一个 Obsidian 插件，可以根据笔记 frontmatter 创建多个并行的虚拟目录树。

它可以让同一批 Markdown 笔记同时按日期、项目、来源、主题、状态或其他自定义维度组织，而不移动仓库里的真实文件。

## 功能

- 创建任意数量的虚拟目录维度。
- 每个维度可显示在左侧栏、右侧栏或两侧同时显示。
- 通过紧凑的侧栏图标切换维度。
- 日期维度可从年份、月份或具体日期开始显示。
- 路径维度可根据 frontmatter 路径属性生成多级虚拟目录。
- 可创建临时虚拟路径，不创建真实文件夹。
- 可将 Markdown 笔记拖入虚拟目录，并写入对应 frontmatter。
- 可通过右键菜单重命名目录/分类。
- 可通过右键菜单更改目录/分类图标。
- 可删除虚拟目录/分类，不删除真实文件。
- 每个维度可按名称、创建时间或修改时间排序。
- 每个维度可选择升序或降序。
- 支持 Emoji 和 Lucide 图标。
- 支持中文和英文界面。

## 示例

一篇笔记可以包含这样的 frontmatter：

```yaml
---
catalog_date: 2026-06-29
project_path: Blog Project/Model Dialogues
source_path: Literature/Pathology
---
```

同一篇笔记可以同时出现在多个虚拟目录树中：

- 日期：`2026 / 2026-06 / 2026-06-29`
- 项目：`Blog Project / Model Dialogues`
- 来源：`Literature / Pathology`

## 安装

### Obsidian 社区插件商店安装

插件通过 Obsidian 社区插件审核后：

1. 打开 Obsidian 设置。
2. 进入“第三方插件”或“Community plugins”。
3. 搜索 `MultiDim Virtual Folders`。
4. 安装并启用插件。

### 离线安装

适用于目标电脑无法访问 GitHub 或 Obsidian 社区插件商店的情况。

1. 在可联网电脑上，从 GitHub Release 下载以下文件：
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. 将这些文件复制到离线电脑。
3. 在目标 Obsidian 仓库中创建目录：

```text
.obsidian/plugins/multidim-virtual-folders/
```

4. 将 `main.js`、`manifest.json`、`styles.css` 放入该目录。
5. 重启 Obsidian 或重新加载应用。
6. 打开设置中的第三方插件页面，启用 `MultiDim Virtual Folders`。

### 手动在线安装

1. 从 GitHub Release 下载 `main.js`、`manifest.json`、`styles.css`。
2. 在你的 Obsidian 仓库中创建目录：

```text
.obsidian/plugins/multidim-virtual-folders/
```

3. 将三个文件放入该目录。
4. 重新加载 Obsidian。
5. 在第三方插件中启用本插件。

### BRAT 安装

在社区插件商店审核通过前，可以用 BRAT 安装这个 GitHub 仓库：

```text
Arislan-x/multidim-virtual-folders
```

## 使用

可以从 Ribbon 图标或命令面板打开插件。

在设置中创建一个或多个虚拟目录维度：

- 日期维度：根据日期 frontmatter 属性分组。
- 路径维度：根据路径形式的 frontmatter 属性分组。

每个维度可配置：

- 标题
- 图标
- 颜色
- Frontmatter 属性
- 显示位置
- 排序方式
- 写入模式
- 临时虚拟路径

大多数维度设置默认锁定。点击“编辑”后修改，点击“保存”后生效。

## 拖拽

将 Markdown 笔记拖入虚拟目录后，插件会把该虚拟路径写入对应的 frontmatter 属性。

只接受 Markdown 文件。真实文件不会被移动。

## 移动端支持

插件已标记为支持移动端。

移动端可以使用侧栏浏览、维度切换、设置页和基于 frontmatter 的虚拟目录。拖拽行为取决于 Obsidian 移动端和操作系统能力，因此桌面端仍是拖拽工作流最完整的使用环境。

## 右键菜单

右键点击虚拟目录/分类可以：

- 更改图标
- 重命名目录/分类
- 创建子分类
- 删除虚拟目录/分类

这些操作只会更新 frontmatter 和插件设置，不会删除或移动仓库中的真实文件。

## 隐私

本插件不会向外部服务发送数据。

插件不使用遥测、分析、远程代码加载或外部网络请求。

所有数据都保存在你的本地 Obsidian 仓库和插件设置中。

## 开发

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

## 许可证

MIT License。见 [LICENSE](LICENSE)。
