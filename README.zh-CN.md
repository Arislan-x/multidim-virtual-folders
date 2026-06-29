<p align="center">
  <img src="assets/logo.svg" alt="MultiDim Virtual Folders logo" width="120">
</p>

# MultiDim Virtual Folders

[English README](README.md)

MultiDim Virtual Folders 是一个 Obsidian 插件，可以根据笔记 frontmatter 创建多个并行的虚拟目录树。

你的笔记不必只待在一个真实文件夹层级里。同一篇 Markdown 可以同时出现在日期、项目、来源、主题或任何你关心的维度中，而真实文件仍然留在原处。

## 为什么需要它

当一个真实目录结构不够用时，就可以使用 MultiDim Virtual Folders。

例如，同一篇笔记既属于某个月份，也属于某个项目，还可能属于某个资料来源。你不需要复制文件，也不需要反复移动笔记，只要写入简单的 frontmatter，插件就会自动生成对应的虚拟侧栏。

## 你可以做什么

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

## 一个小例子

给笔记添加这样的 frontmatter：

```yaml
---
catalog_date: 2026-06-29
project_path: 示例项目/阶段一
source_path: 参考资料/手册
---
```

这篇笔记就可以同时出现在多个虚拟目录树中：

- 日期：`2026 / 2026-06 / 2026-06-29`
- 项目：`示例项目 / 阶段一`
- 来源：`参考资料 / 手册`

## 安装

### Obsidian 社区插件商店安装

插件通过 Obsidian 社区插件审核后：

1. 打开 Obsidian 设置。
2. 进入“第三方插件”或“Community plugins”。
3. 搜索 `MultiDim Virtual Folders`。
4. 安装并启用插件。

### 图文设置步骤

下面的截图使用中文 Obsidian 界面，其他语言界面的操作路径相同。

1. 打开 Obsidian 设置。

![打开设置](<Screenshots/1.点击左下角设置.png>)

2. 进入第三方插件。

![进入第三方插件](<Screenshots/2. 点击右上角“第三方应用”.png>)

3. 找到 `multidim-virtual-folders`。

![找到插件](<Screenshots/3.找到“multidim-virtual-folders”.png>)

4. 打开插件选项。

![打开选项](<Screenshots/4.点击“选项”.png>)

5. 回到主界面，点击底部图标打开虚拟目录侧栏。

![打开目录栏](<Screenshots/5. 回到主界面，点击最下面图标，即可生成目录栏.png>)

### 单文件离线安装

适用于目标电脑无法访问 GitHub 或 Obsidian 社区插件商店的情况。

1. 在可联网电脑上，从 [最新 GitHub Release](https://github.com/Arislan-x/multidim-virtual-folders/releases) 下载 `multidim-virtual-folders.zip`。
2. 将 zip 文件复制到离线电脑。
3. 打开目标 Obsidian 仓库目录，进入：

```text
.obsidian/plugins/
```

4. 将 `multidim-virtual-folders.zip` 解压到该目录。
5. 确认文件位于：

```text
.obsidian/plugins/multidim-virtual-folders/
```

6. 重启 Obsidian 或重新加载应用。
7. 打开设置中的第三方插件页面，启用 `MultiDim Virtual Folders`。

### 单文件手动安装

1. 从 [最新 GitHub Release](https://github.com/Arislan-x/multidim-virtual-folders/releases) 下载 `multidim-virtual-folders.zip`。
2. 打开你的 Obsidian 仓库目录，进入：

```text
.obsidian/plugins/
```

3. 将 zip 文件解压到该目录。
4. 重新加载 Obsidian。
5. 在第三方插件中启用本插件。

### BRAT 安装

在社区插件商店审核通过前，可以用 BRAT 安装这个 GitHub 仓库：

```text
Arislan-x/multidim-virtual-folders
```

## 使用体验

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

大多数维度设置默认锁定，避免误改已经调好的结构。点击“编辑”后修改，点击“保存”后生效。

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

## 许可证

MIT License。见 [LICENSE](LICENSE)。
