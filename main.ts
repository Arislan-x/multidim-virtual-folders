import {
  App,
  FileSystemAdapter,
  ItemView,
  Menu,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf,
  setIcon
} from "obsidian";

const VIEW_TYPE_LEFT = "multidim-virtual-folders-view";
const VIEW_TYPE_RIGHT = "multidim-virtual-folders-right-view";
const DATA_TRANSFER_FILE_PATH =
  "application/x-multidim-virtual-folders-file-path";
const DEFAULT_PATH_SEPARATOR = "/";
let lastKnownDraggedMarkdownPath: string | null = null;

type SidebarSide = "left" | "right";
type DefaultOpenSide = SidebarSide | "both";
type DimensionDisplaySide = SidebarSide | "both";
type VirtualDimensionType = "date" | "path";
type WriteMode = "replace" | "append" | "move";
type Language = "zh" | "en";
type DateDisplayMode = "year" | "month" | "day";
type SortBy = "name" | "created" | "modified";
type SortDirection = "asc" | "desc";
type IconPresetGroup = "emoji" | "lucide";

interface VirtualDimensionConfig {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  type: VirtualDimensionType;
  property: string;
  fallbackProperty?: string;
  separator?: string;
  writeMode: WriteMode;
  enabled: boolean;
  displaySide: DimensionDisplaySide;
  dateDisplayMode?: DateDisplayMode;
  manualPaths?: string[];
  pathIcons?: Record<string, string>;
  sortBy?: SortBy;
  sortDirection?: SortDirection;
}

interface MultiDimVirtualFoldersSettings {
  language: Language;
  defaultViewSide: DefaultOpenSide;
  dimensions: VirtualDimensionConfig[];
}

interface LegacySettings {
  language?: string;
  enableDate?: boolean;
  enableProject?: boolean;
  enableSource?: boolean;
  dateProperty?: string;
  dateFallbackProperty?: string;
  projectProperty?: string;
  sourceProperty?: string;
  pathSeparator?: string;
}

interface IconPreset {
  value: string;
  label: string;
  group: IconPresetGroup;
}

interface VirtualTreeNode {
  name: string;
  path: string;
  depth: number;
  children: Map<string, VirtualTreeNode>;
  files: TFile[];
  filePaths: Set<string>;
  isManual: boolean;
}

interface DimensionTree {
  config: VirtualDimensionConfig;
  root: VirtualTreeNode;
}

type FrontmatterRecord = Record<string, unknown>;
type RawSettings = Partial<MultiDimVirtualFoldersSettings> & LegacySettings;
type TranslationKey = keyof typeof TRANSLATIONS.zh;

const DIMENSION_COLOR_PALETTE = [
  "#c65f6a",
  "#d1856f",
  "#7b8fc4",
  "#5f9a8b",
  "#b47cc7",
  "#c79a4b",
  "#5f94b8",
  "#9a8a6a"
];
const NODE_COLOR_PALETTE = [
  "#c65f6a",
  "#d1856f",
  "#c79a4b",
  "#7a9f55",
  "#5f9a8b",
  "#5f94b8",
  "#7b8fc4",
  "#9a78c8",
  "#b86fa6",
  "#b8747f"
];

const ICON_PRESET_GROUPS: IconPresetGroup[] = ["emoji", "lucide"];
const ICON_PRESETS: IconPreset[] = [
  { value: "📅", label: "Calendar", group: "emoji" },
  { value: "🗓️", label: "Schedule", group: "emoji" },
  { value: "📆", label: "Date", group: "emoji" },
  { value: "📁", label: "Folder", group: "emoji" },
  { value: "📂", label: "Open folder", group: "emoji" },
  { value: "🗂️", label: "Index", group: "emoji" },
  { value: "🧠", label: "Brain", group: "emoji" },
  { value: "💡", label: "Idea", group: "emoji" },
  { value: "🔬", label: "Microscope", group: "emoji" },
  { value: "🧪", label: "Lab", group: "emoji" },
  { value: "🧬", label: "DNA", group: "emoji" },
  { value: "📚", label: "Library", group: "emoji" },
  { value: "📖", label: "Book", group: "emoji" },
  { value: "🔖", label: "Bookmark", group: "emoji" },
  { value: "📝", label: "Note", group: "emoji" },
  { value: "✅", label: "Done", group: "emoji" },
  { value: "🎯", label: "Goal", group: "emoji" },
  { value: "⭐", label: "Star", group: "emoji" },
  { value: "⚡", label: "Energy", group: "emoji" },
  { value: "🧭", label: "Compass", group: "emoji" },
  { value: "📦", label: "Package", group: "emoji" },
  { value: "🧾", label: "Receipt", group: "emoji" },
  { value: "💼", label: "Project", group: "emoji" },
  { value: "🏷️", label: "Tag", group: "emoji" },
  { value: "🔎", label: "Search", group: "emoji" },
  { value: "🔗", label: "Link", group: "emoji" },
  { value: "🧩", label: "Puzzle", group: "emoji" },
  { value: "🧰", label: "Toolbox", group: "emoji" },
  { value: "📌", label: "Pin", group: "emoji" },
  { value: "🚩", label: "Flag", group: "emoji" },
  { value: "⏳", label: "Time", group: "emoji" },
  { value: "📍", label: "Location", group: "emoji" },
  { value: "folder-tree", label: "Folder tree", group: "lucide" },
  { value: "folder", label: "Folder", group: "lucide" },
  { value: "folder-open", label: "Open folder", group: "lucide" },
  { value: "folders", label: "Folders", group: "lucide" },
  { value: "calendar-days", label: "Calendar days", group: "lucide" },
  { value: "calendar-range", label: "Calendar range", group: "lucide" },
  { value: "calendar-clock", label: "Calendar clock", group: "lucide" },
  { value: "briefcase-business", label: "Project", group: "lucide" },
  { value: "archive", label: "Archive", group: "lucide" },
  { value: "book-open", label: "Book", group: "lucide" },
  { value: "bookmark", label: "Bookmark", group: "lucide" },
  { value: "database", label: "Database", group: "lucide" },
  { value: "flask-conical", label: "Lab flask", group: "lucide" },
  { value: "test-tube", label: "Test tube", group: "lucide" },
  { value: "microscope", label: "Microscope", group: "lucide" },
  { value: "stethoscope", label: "Medical", group: "lucide" },
  { value: "brain", label: "Brain", group: "lucide" },
  { value: "dna", label: "DNA", group: "lucide" },
  { value: "network", label: "Network", group: "lucide" },
  { value: "tags", label: "Tags", group: "lucide" },
  { value: "tag", label: "Tag", group: "lucide" },
  { value: "search", label: "Search", group: "lucide" },
  { value: "link", label: "Link", group: "lucide" },
  { value: "puzzle", label: "Puzzle", group: "lucide" },
  { value: "wrench", label: "Tool", group: "lucide" },
  { value: "pin", label: "Pin", group: "lucide" },
  { value: "flag", label: "Flag", group: "lucide" },
  { value: "clock", label: "Clock", group: "lucide" },
  { value: "map-pin", label: "Location", group: "lucide" },
  { value: "sparkles", label: "Sparkles", group: "lucide" },
  { value: "lightbulb", label: "Idea", group: "lucide" },
  { value: "target", label: "Target", group: "lucide" }
];

const DEFAULT_DIMENSIONS: VirtualDimensionConfig[] = [
  {
    id: "date",
    title: "日期目录",
    icon: "calendar-days",
    color: "#c65f6a",
    type: "date",
    property: "catalog_date",
    fallbackProperty: "created",
    writeMode: "replace",
    enabled: true,
    displaySide: "both",
    dateDisplayMode: "year",
    sortBy: "name",
    sortDirection: "desc"
  },
  {
    id: "project",
    title: "项目目录",
    icon: "folder-tree",
    color: "#d1856f",
    type: "path",
    property: "project_path",
    separator: DEFAULT_PATH_SEPARATOR,
    writeMode: "replace",
    enabled: true,
    displaySide: "both",
    manualPaths: [],
    pathIcons: {},
    sortBy: "name",
    sortDirection: "asc"
  },
  {
    id: "source",
    title: "来源目录",
    icon: "archive",
    color: "#7b8fc4",
    type: "path",
    property: "source_path",
    separator: DEFAULT_PATH_SEPARATOR,
    writeMode: "replace",
    enabled: true,
    displaySide: "both",
    manualPaths: [],
    pathIcons: {},
    sortBy: "name",
    sortDirection: "asc"
  }
];

const TRANSLATIONS = {
  zh: {
    ribbonOpen: "打开多维虚拟目录",
    commandOpenDefault: "打开多维虚拟目录",
    commandOpenLeft: "在左栏打开多维虚拟目录",
    commandOpenRight: "在右栏打开多维虚拟目录",
    viewTitle: "多维虚拟目录",
    appName: "MultiDim Virtual Folders",
    leftSidebar: "左栏",
    rightSidebar: "右栏",
    leftSubtitle: "左侧栏",
    rightSubtitle: "右侧栏",
    cannotOpenView: "无法打开{side}多维虚拟目录视图。",
    emptySidebar: "此侧栏未启用虚拟目录。",
    missingDraggedPath: "未读取到拖拽文件路径。",
    markdownOnly: "只能将md文件拖拽进目录中",
    updatedProperty: "已更新 {file} 的 {property}: {value}",
    updateFailed: "更新 {property} 失败，详情见控制台。",
    invalidVirtualPath: "请输入有效的虚拟路径。",
    virtualPathAdded: "已创建临时虚拟层级：{path}",
    virtualPathExists: "虚拟层级已存在：{path}",
    virtualPathRemoved: "已移除临时虚拟层级：{path}",
    contextChangeIcon: "更改图标",
    contextRenameCategory: "重命名该目录/分类",
    contextCreateSubcategory: "创建子分类",
    contextDeleteCategory: "删除该目录/分类",
    promptIcon: "输入图标、emoji 或 Lucide 图标 ID：",
    promptRenameCategory: "输入新的目录/分类名称：",
    promptSubcategory: "输入子分类名称或路径：",
    confirmDeleteCategory:
      "删除虚拟分类“{path}”？这会从 {count} 篇笔记的 {property} 中移除该分类或其子分类，不会删除真实文件。",
    categoryRenamed: "已重命名虚拟分类：{oldPath} -> {newPath}",
    categoryRenameFailed: "重命名虚拟分类失败，详情见控制台。",
    categoryDeleted: "已删除虚拟分类：{path}",
    categoryDeleteFailed: "删除虚拟分类失败，详情见控制台。",
    confirmAction: "确定",
    cancelAction: "取消",
    settingsLanguageName: "界面语言",
    settingsLanguageDesc: "切换插件面板、设置页和提示文案的语言。",
    languageZh: "中文",
    languageEn: "English",
    defaultOpenPosition: "默认打开位置",
    defaultOpenPositionDesc: "Ribbon 按钮和默认打开命令使用的位置。",
    dimensionsName: "创建虚拟目录/维度",
    dimensionsDesc:
      "这里创建的是一个新的虚拟目录维度，不会创建真实文件夹。路径目录维度按 frontmatter 路径属性分组；日期目录维度按日期属性分组。",
    addPathDimension: "创建路径目录/维度",
    addDateDimension: "创建日期目录/维度",
    noDimensions: "尚未创建任何维度。",
    none: "无",
    enabled: "启用",
    title: "标题",
    iconName: "图标",
    iconDesc: "从下拉面板选择 Emoji 或 Lucide 图标，也可输入自定义值。",
    iconSelect: "选择图标",
    iconPickerEmoji: "Emoji",
    iconPickerLucide: "Lucide",
    iconCustomInput: "自定义图标",
    editDimension: "编辑",
    saveDimension: "保存",
    lockedDimension: "已锁定，点编辑后修改。",
    colorName: "颜色",
    colorDesc: "用于维度根节点和缩进线的强调色。",
    untitledDimension: "未命名目录",
    type: "类型",
    typeDesc: "日期维度生成 年/月/日；路径维度按分隔符生成多级目录。",
    dateDimension: "日期维度",
    pathDimension: "路径维度",
    displayPosition: "显示位置",
    displayPositionDesc: "同一个维度可以显示在左栏、右栏，或两侧同时显示。",
    bothSide: "左栏和右栏",
    leftOnly: "仅左栏",
    rightOnly: "仅右栏",
    propertyName: "Frontmatter 属性",
    propertyDesc: "将笔记拖入此维度时写入的属性。",
    dateFallbackProperty: "日期回退属性",
    dateFallbackPropertyDesc: "只用于显示回退；拖拽仍只写入上方属性。",
    dateDisplayModeName: "日期根层级",
    dateDisplayModeDesc: "选择日期目录从年份、月份或日期开始显示。",
    dateDisplayYear: "年份",
    dateDisplayMonth: "月份",
    dateDisplayDay: "日期",
    separatorName: "路径分隔符",
    temporaryVirtualPaths: "临时虚拟路径",
    temporaryVirtualPathsDesc:
      "只在虚拟树中创建可拖放目标，不创建真实文件夹。拖入笔记会写入目标属性。",
    temporaryVirtualPathPlaceholder: "例：病理世界/循证病理平台",
    addTemporaryVirtualPath: "创建临时路径",
    temporaryBadge: "临时",
    sortMenuTitle: "排序",
    sortByNameLabel: "排序方式",
    sortByName: "名称",
    sortByCreated: "创建时间",
    sortByModified: "修改时间",
    sortAsc: "升序",
    sortDesc: "降序",
    sortUpdated: "已更新排序：{sortBy}，{direction}",
    writeMode: "写入模式",
    writeModeDesc:
      "replace 会替换目标属性；append 会追加去重；move 预留为后续扩展，目前按 replace 处理。",
    orderAndDelete: "排序与删除",
    moveUp: "上移",
    moveDown: "下移",
    delete: "删除",
    defaultDateTitle: "日期目录",
    defaultProjectTitle: "项目目录",
    defaultSourceTitle: "来源目录",
    newDateDimension: "新日期目录 {number}",
    newPathDimension: "新路径目录 {number}"
  },
  en: {
    ribbonOpen: "Open MultiDim Virtual Folders",
    commandOpenDefault: "Open MultiDim Virtual Folders",
    commandOpenLeft: "Open MultiDim Virtual Folders in left sidebar",
    commandOpenRight: "Open MultiDim Virtual Folders in right sidebar",
    viewTitle: "MultiDim Virtual Folders",
    appName: "MultiDim Virtual Folders",
    leftSidebar: "left sidebar",
    rightSidebar: "right sidebar",
    leftSubtitle: "Left sidebar",
    rightSubtitle: "Right sidebar",
    cannotOpenView: "Could not open MultiDim Virtual Folders in the {side}.",
    emptySidebar: "No virtual dimensions are enabled for this sidebar.",
    missingDraggedPath: "Could not read the dragged file path.",
    markdownOnly: "Only Markdown files can be dropped into folders.",
    updatedProperty: "Updated {file} {property}: {value}",
    updateFailed: "Failed to update {property}. See the console for details.",
    invalidVirtualPath: "Enter a valid virtual path.",
    virtualPathAdded: "Created temporary virtual path: {path}",
    virtualPathExists: "Virtual path already exists: {path}",
    virtualPathRemoved: "Removed temporary virtual path: {path}",
    contextChangeIcon: "Change icon",
    contextRenameCategory: "Rename this folder/category",
    contextCreateSubcategory: "Create subcategory",
    contextDeleteCategory: "Delete this folder/category",
    promptIcon: "Enter an icon, emoji, or Lucide icon ID:",
    promptRenameCategory: "Enter the new folder/category name:",
    promptSubcategory: "Enter a subcategory name or path:",
    confirmDeleteCategory:
      "Delete virtual category \"{path}\"? This removes the category or descendants from {property} in {count} notes. Real files are not deleted.",
    categoryRenamed: "Renamed virtual category: {oldPath} -> {newPath}",
    categoryRenameFailed: "Failed to rename virtual category. See the console for details.",
    categoryDeleted: "Deleted virtual category: {path}",
    categoryDeleteFailed: "Failed to delete virtual category. See the console for details.",
    confirmAction: "OK",
    cancelAction: "Cancel",
    settingsLanguageName: "Interface language",
    settingsLanguageDesc: "Switch the plugin pane, settings page, and notices.",
    languageZh: "中文",
    languageEn: "English",
    defaultOpenPosition: "Default open side",
    defaultOpenPositionDesc: "Used by the ribbon button and the default open command.",
    dimensionsName: "Create virtual folders / dimensions",
    dimensionsDesc:
      "This creates a new virtual folder dimension, not a real folder. Path dimensions group notes by a frontmatter path property; date dimensions group notes by a date property.",
    addPathDimension: "Create path folder/dimension",
    addDateDimension: "Create date folder/dimension",
    noDimensions: "No dimensions have been created.",
    none: "None",
    enabled: "Enabled",
    title: "Title",
    iconName: "Icon",
    iconDesc: "Choose an Emoji or Lucide icon from the dropdown, or enter a custom value.",
    iconSelect: "Choose icon",
    iconPickerEmoji: "Emoji",
    iconPickerLucide: "Lucide",
    iconCustomInput: "Custom icon",
    editDimension: "Edit",
    saveDimension: "Save",
    lockedDimension: "Locked. Click Edit to change it.",
    colorName: "Color",
    colorDesc: "Accent color for the dimension header and indentation lines.",
    untitledDimension: "Untitled folder",
    type: "Type",
    typeDesc: "Date dimensions render year/month/day; path dimensions render nested nodes by separator.",
    dateDimension: "Date dimension",
    pathDimension: "Path dimension",
    displayPosition: "Display side",
    displayPositionDesc: "The same dimension can appear on the left sidebar, right sidebar, or both.",
    bothSide: "Left and right",
    leftOnly: "Left only",
    rightOnly: "Right only",
    propertyName: "Frontmatter property",
    propertyDesc: "The property written when a note is dropped onto this dimension.",
    dateFallbackProperty: "Date fallback property",
    dateFallbackPropertyDesc: "Only used as a display fallback; drops still write only to the property above.",
    dateDisplayModeName: "Date root level",
    dateDisplayModeDesc: "Choose whether this date dimension opens from year, month, or day.",
    dateDisplayYear: "Year",
    dateDisplayMonth: "Month",
    dateDisplayDay: "Day",
    separatorName: "Path separator",
    temporaryVirtualPaths: "Temporary virtual paths",
    temporaryVirtualPathsDesc:
      "Creates drop targets only in the virtual tree, without creating real folders. Dropped notes write the target property.",
    temporaryVirtualPathPlaceholder: "Example: Medical World/Evidence Platform",
    addTemporaryVirtualPath: "Create temporary path",
    temporaryBadge: "Temporary",
    sortMenuTitle: "Sort",
    sortByNameLabel: "Sort by",
    sortByName: "Name",
    sortByCreated: "Created",
    sortByModified: "Modified",
    sortAsc: "Ascending",
    sortDesc: "Descending",
    sortUpdated: "Updated sort: {sortBy}, {direction}",
    writeMode: "Write mode",
    writeModeDesc:
      "replace overwrites the target property; append adds unique values; move is reserved and currently behaves like replace.",
    orderAndDelete: "Order and delete",
    moveUp: "Move up",
    moveDown: "Move down",
    delete: "Delete",
    defaultDateTitle: "Date folder",
    defaultProjectTitle: "Project folder",
    defaultSourceTitle: "Source folder",
    newDateDimension: "New date folder {number}",
    newPathDimension: "New path folder {number}"
  }
};

export default class MultiDimVirtualFoldersPlugin extends Plugin {
  settings: MultiDimVirtualFoldersSettings = createDefaultSettings();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_LEFT,
      (leaf) => new MultiDimVirtualFoldersView(leaf, this, "left")
    );
    this.registerView(
      VIEW_TYPE_RIGHT,
      (leaf) => new MultiDimVirtualFoldersView(leaf, this, "right")
    );

    this.addRibbonIcon("folder-tree", this.t("ribbonOpen"), async () => {
      await this.activateDefaultView();
    });

    this.addCommand({
      id: "open-default",
      name: this.t("commandOpenDefault"),
      callback: async () => {
        await this.activateDefaultView();
      }
    });

    this.addCommand({
      id: "open-left",
      name: this.t("commandOpenLeft"),
      callback: async () => {
        await this.activateView("left");
      }
    });

    this.addCommand({
      id: "open-right",
      name: this.t("commandOpenRight"),
      callback: async () => {
        await this.activateView("right");
      }
    });

    this.registerDomEvent(document, "dragstart", (event: DragEvent) => {
      const filePath = readMarkdownPathFromDragSource(this.app, event.target);
      if (!filePath) {
        return;
      }

      lastKnownDraggedMarkdownPath = filePath;
      try {
        event.dataTransfer?.setData(DATA_TRANSFER_FILE_PATH, filePath);
        event.dataTransfer?.setData("text/plain", filePath);
      } catch {
        // Some native drags disallow writing to DataTransfer; the in-memory fallback still works.
      }
    });

    this.registerDomEvent(document, "dragend", () => {
      window.setTimeout(() => {
        lastKnownDraggedMarkdownPath = null;
      }, 0);
    });

    this.addSettingTab(new MultiDimVirtualFoldersSettingTab(this.app, this));
  }

  onunload(): void {
    for (const viewType of getAllViewTypes()) {
      this.app.workspace.detachLeavesOfType(viewType);
    }
  }

  async activateDefaultView(): Promise<void> {
    if (this.settings.defaultViewSide === "both") {
      await this.activateView("left");
      await this.activateView("right");
      return;
    }

    await this.activateView(this.settings.defaultViewSide);
  }

  async activateView(side: SidebarSide): Promise<void> {
    const viewType = getViewTypeForSide(side);
    const existingLeaves = this.app.workspace.getLeavesOfType(viewType);

    if (existingLeaves.length > 0) {
      this.app.workspace.revealLeaf(existingLeaves[0]);
      return;
    }

    const leaf =
      side === "left"
        ? this.app.workspace.getLeftLeaf(false)
        : this.app.workspace.getRightLeaf(false);

    if (!leaf) {
      new Notice(
        this.t("cannotOpenView", {
          side: this.t(side === "left" ? "leftSidebar" : "rightSidebar")
        })
      );
      return;
    }

    await leaf.setViewState({
      type: viewType,
      active: true
    });
    this.app.workspace.revealLeaf(leaf);
  }

  getDimensions(side?: SidebarSide): VirtualDimensionConfig[] {
    return this.settings.dimensions
      .filter((dimension) => dimension.enabled)
      .filter(
        (dimension) =>
          !side ||
          dimension.displaySide === "both" ||
          dimension.displaySide === side
      );
  }

  async addManualPath(dimensionId: string, rawPath: string): Promise<boolean> {
    const dimension = this.settings.dimensions.find(
      (candidate) => candidate.id === dimensionId
    );

    if (!dimension || dimension.type !== "path") {
      return false;
    }

    const normalizedPath = normalizeVirtualPath(
      rawPath,
      dimension.separator || DEFAULT_PATH_SEPARATOR
    );

    if (!normalizedPath) {
      new Notice(this.t("invalidVirtualPath"));
      return false;
    }

    const manualPaths = normalizeManualPaths(
      dimension.manualPaths,
      dimension.separator || DEFAULT_PATH_SEPARATOR
    );

    if (manualPaths.includes(normalizedPath)) {
      new Notice(this.t("virtualPathExists", { path: normalizedPath }));
      return false;
    }

    dimension.manualPaths = [...manualPaths, normalizedPath];
    await this.saveSettings();
    new Notice(this.t("virtualPathAdded", { path: normalizedPath }));
    return true;
  }

  async removeManualPath(dimensionId: string, rawPath: string): Promise<void> {
    const dimension = this.settings.dimensions.find(
      (candidate) => candidate.id === dimensionId
    );

    if (!dimension || dimension.type !== "path") {
      return;
    }

    const separator = dimension.separator || DEFAULT_PATH_SEPARATOR;
    const normalizedPath = normalizeVirtualPath(rawPath, separator);

    if (!normalizedPath) {
      return;
    }

    dimension.manualPaths = normalizeManualPaths(
      dimension.manualPaths,
      separator
    ).filter((path) => path !== normalizedPath);
    await this.saveSettings();
    new Notice(this.t("virtualPathRemoved", { path: normalizedPath }));
  }

  async setPathIcon(
    dimensionId: string,
    rawPath: string,
    rawIcon: string
  ): Promise<void> {
    const dimension = this.settings.dimensions.find(
      (candidate) => candidate.id === dimensionId
    );

    if (!dimension || dimension.type !== "path") {
      return;
    }

    const separator = dimension.separator || DEFAULT_PATH_SEPARATOR;
    const normalizedPath = normalizeVirtualPath(rawPath, separator);

    if (!normalizedPath) {
      return;
    }

    const icon = rawIcon.trim();
    const pathIcons = normalizePathIcons(dimension.pathIcons, separator);

    if (icon) {
      pathIcons[normalizedPath] = icon;
    } else {
      delete pathIcons[normalizedPath];
    }

    dimension.pathIcons = pathIcons;
    await this.saveSettings();
  }

  async renameCategory(
    dimensionId: string,
    rawPath: string,
    rawNewName: string,
    filePaths: string[]
  ): Promise<void> {
    const dimension = this.settings.dimensions.find(
      (candidate) => candidate.id === dimensionId
    );

    if (!dimension || dimension.type !== "path") {
      return;
    }

    const separator = dimension.separator || DEFAULT_PATH_SEPARATOR;
    const normalizedPath = normalizeVirtualPath(rawPath, separator);
    const renamedPath = buildRenamedCategoryPath(
      normalizedPath,
      rawNewName,
      separator
    );

    if (!normalizedPath || !renamedPath) {
      new Notice(this.t("invalidVirtualPath"));
      return;
    }

    if (normalizedPath === renamedPath) {
      return;
    }

    try {
      const markdownFiles = uniqueStrings(filePaths)
        .map((path) => this.app.vault.getAbstractFileByPath(path))
        .filter(
          (file): file is TFile =>
            file instanceof TFile && file.extension === "md"
        );

      for (const file of markdownFiles) {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          renamePathCategoryInFrontmatter(
            frontmatter as FrontmatterRecord,
            dimension.property,
            normalizedPath,
            renamedPath,
            separator
          );
        });
      }

      dimension.manualPaths = renamePathCategoryList(
        dimension.manualPaths,
        normalizedPath,
        renamedPath,
        separator
      );
      dimension.pathIcons = renamePathIconCategory(
        dimension.pathIcons,
        normalizedPath,
        renamedPath,
        separator
      );

      await this.saveSettings();
      new Notice(
        this.t("categoryRenamed", {
          oldPath: normalizedPath,
          newPath: renamedPath
        })
      );
    } catch (error) {
      console.error(
        "MultiDim Virtual Folders: failed to rename virtual category",
        {
          dimensionId,
          oldPath: normalizedPath,
          newPath: renamedPath,
          property: dimension.property
        },
        error
      );
      new Notice(this.t("categoryRenameFailed"));
    }
  }

  async deleteCategory(
    dimensionId: string,
    rawPath: string,
    filePaths: string[]
  ): Promise<void> {
    const dimension = this.settings.dimensions.find(
      (candidate) => candidate.id === dimensionId
    );

    if (!dimension || dimension.type !== "path") {
      return;
    }

    const separator = dimension.separator || DEFAULT_PATH_SEPARATOR;
    const normalizedPath = normalizeVirtualPath(rawPath, separator);

    if (!normalizedPath) {
      return;
    }

    try {
      const markdownFiles = uniqueStrings(filePaths)
        .map((path) => this.app.vault.getAbstractFileByPath(path))
        .filter(
          (file): file is TFile =>
            file instanceof TFile && file.extension === "md"
        );

      for (const file of markdownFiles) {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          removePathCategoryFromFrontmatter(
            frontmatter as FrontmatterRecord,
            dimension.property,
            normalizedPath,
            separator
          );
        });
      }

      dimension.manualPaths = normalizeManualPaths(
        dimension.manualPaths,
        separator
      ).filter((path) => !isPathInCategory(path, normalizedPath, separator));
      dimension.pathIcons = removePathIconCategory(
        dimension.pathIcons,
        normalizedPath,
        separator
      );

      await this.saveSettings();
      new Notice(this.t("categoryDeleted", { path: normalizedPath }));
    } catch (error) {
      console.error(
        "MultiDim Virtual Folders: failed to delete virtual category",
        { dimensionId, path: normalizedPath, property: dimension.property },
        error
      );
      new Notice(this.t("categoryDeleteFailed"));
    }
  }

  async updateDimensionSort(
    dimensionId: string,
    sortBy: SortBy,
    sortDirection: SortDirection
  ): Promise<void> {
    const dimension = this.settings.dimensions.find(
      (candidate) => candidate.id === dimensionId
    );

    if (!dimension) {
      return;
    }

    dimension.sortBy = sortBy;
    dimension.sortDirection = sortDirection;
    await this.saveSettings();
    new Notice(
      this.t("sortUpdated", {
        sortBy: getSortByLabel(this, sortBy),
        direction: getSortDirectionLabel(this, sortDirection)
      })
    );
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings((await this.loadData()) as RawSettings | null);
  }

  async saveSettings(): Promise<void> {
    this.settings = normalizeSettings(this.settings);
    await this.saveData(this.settings);
  }

  t(
    key: TranslationKey,
    replacements?: Record<string, string | number>
  ): string {
    return translate(this.settings.language, key, replacements);
  }
}

class MultiDimVirtualFoldersView extends ItemView {
  private activeDimensionId: string | null = null;
  private renderTimer: number | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: MultiDimVirtualFoldersPlugin,
    private readonly side: SidebarSide
  ) {
    super(leaf);
  }

  getViewType(): string {
    return getViewTypeForSide(this.side);
  }

  getDisplayText(): string {
    return this.plugin.t("viewTitle");
  }

  getIcon(): string {
    return "folder-tree";
  }

  async onOpen(): Promise<void> {
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          this.requestRender();
        }
      })
    );
    this.registerEvent(this.app.vault.on("rename", () => this.requestRender()));
    this.registerEvent(this.app.vault.on("delete", () => this.requestRender()));
    this.registerEvent(
      this.app.metadataCache.on("changed", () => this.requestRender())
    );
    this.render();
  }

  async onClose(): Promise<void> {
    if (this.renderTimer !== null) {
      window.clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    this.contentEl.empty();
  }

  requestRender(delay = 150): void {
    if (this.renderTimer !== null) {
      window.clearTimeout(this.renderTimer);
    }

    this.renderTimer = window.setTimeout(() => {
      this.renderTimer = null;
      this.render();
    }, delay);
  }

  private render(): void {
    const dimensions = this.plugin.getDimensions(this.side);

    this.contentEl.empty();
    const rootEl = this.contentEl.createDiv({ cls: "multidim-vf-root" });

    if (dimensions.length === 0) {
      rootEl.createDiv({
        cls: "multidim-vf-empty",
        text: this.plugin.t("emptySidebar")
      });
      return;
    }

    const activeDimension = this.resolveActiveDimension(dimensions);
    this.renderDimensionSwitcher(rootEl, dimensions, activeDimension.id);
    this.renderManualPathCreator(rootEl, activeDimension);

    const tree = buildDimensionTree(this.app, activeDimension);
    this.renderDimension(rootEl, tree);
  }

  private resolveActiveDimension(
    dimensions: VirtualDimensionConfig[]
  ): VirtualDimensionConfig {
    const existing = dimensions.find(
      (dimension) => dimension.id === this.activeDimensionId
    );

    if (existing) {
      return existing;
    }

    this.activeDimensionId = dimensions[0].id;
    return dimensions[0];
  }

  private renderDimensionSwitcher(
    rootEl: HTMLElement,
    dimensions: VirtualDimensionConfig[],
    activeDimensionId: string
  ): void {
    const switcherEl = rootEl.createDiv({ cls: "multidim-vf-switcher" });

    for (const dimension of dimensions) {
      const title = getDimensionTitle(dimension, this.plugin.settings.language);
      const buttonEl = switcherEl.createEl("button", {
        cls: "multidim-vf-switcher-button"
      });
      buttonEl.type = "button";
      buttonEl.title = title;
      buttonEl.setAttribute("aria-label", title);
      buttonEl.style.setProperty(
        "--multidim-vf-accent",
        normalizeColor(dimension.color)
      );
      buttonEl.style.setProperty(
        "--multidim-vf-accent-soft",
        toRgbColor(normalizeColor(dimension.color))
      );

      if (dimension.id === activeDimensionId) {
        buttonEl.classList.add("is-active");
      }

      const iconEl = buttonEl.createSpan({
        cls: "multidim-vf-switcher-icon"
      });
      renderFlexibleIcon(iconEl, dimension.icon, getDefaultDimensionIcon(dimension));

      buttonEl.addEventListener("click", () => {
        this.activeDimensionId = dimension.id;
        this.render();
      });
      buttonEl.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.showDimensionMenu(event, dimension);
      });
    }
  }

  private showDimensionMenu(event: MouseEvent, dimension: VirtualDimensionConfig): void {
    const menu = new Menu();

    const sortPairs: Array<[SortBy, SortDirection]> = [
      ["name", "asc"],
      ["name", "desc"],
      ["created", "asc"],
      ["created", "desc"],
      ["modified", "asc"],
      ["modified", "desc"]
    ];

    for (const [sortBy, sortDirection] of sortPairs) {
      menu.addItem((item) => {
        item
          .setTitle(`${getSortByLabel(this.plugin, sortBy)} · ${getSortDirectionLabel(this.plugin, sortDirection)}`)
          .setIcon(sortDirection === "asc" ? "arrow-up" : "arrow-down")
          .onClick(async () => {
            await this.plugin.updateDimensionSort(
              dimension.id,
              sortBy,
              sortDirection
            );
            this.requestRender(0);
          });
      });
    }

    menu.showAtMouseEvent(event);
  }

  private renderManualPathCreator(
    rootEl: HTMLElement,
    dimension: VirtualDimensionConfig
  ): void {
    if (dimension.type !== "path") {
      return;
    }

    let draftPath = "";
    const creatorEl = rootEl.createDiv({
      cls: "multidim-vf-manual-path"
    });
    const inputEl = creatorEl.createEl("input", {
      attr: {
        type: "text",
        placeholder: this.plugin.t("temporaryVirtualPathPlaceholder")
      }
    });
    inputEl.addEventListener("input", () => {
      draftPath = inputEl.value;
    });

    const buttonEl = creatorEl.createEl("button", {
      text: this.plugin.t("addTemporaryVirtualPath")
    });
    buttonEl.type = "button";
    buttonEl.addEventListener("click", async () => {
      const didAdd = await this.plugin.addManualPath(dimension.id, draftPath);
      if (didAdd) {
        this.requestRender(0);
      }
    });
  }

  private renderDimension(parentEl: HTMLElement, tree: DimensionTree): void {
    const treeEl = parentEl.createDiv({ cls: "multidim-vf-tree" });

    const children = sortNodes(Array.from(tree.root.children.values()), tree.config);
    for (const child of children) {
      this.renderNode(treeEl, tree.config, child);
    }
  }

  private renderNode(
    parentEl: HTMLElement,
    config: VirtualDimensionConfig,
    node: VirtualTreeNode
  ): void {
    const detailsEl = parentEl.createEl("details", {
      cls: "multidim-vf-node"
    });
    detailsEl.open = true;
    const nodeColor = getNodeColor(config, node);
    detailsEl.style.setProperty("--multidim-vf-depth", String(node.depth));
    detailsEl.style.setProperty("--multidim-vf-accent", normalizeColor(config.color));
    detailsEl.style.setProperty(
      "--multidim-vf-accent-soft",
      toRgbColor(normalizeColor(config.color))
    );
    detailsEl.style.setProperty("--multidim-vf-node-accent", nodeColor);
    detailsEl.style.setProperty(
      "--multidim-vf-node-accent-soft",
      toRgbColor(nodeColor)
    );

    const summaryEl = detailsEl.createEl("summary", {
      cls:
        node.depth === 0
          ? "multidim-vf-summary multidim-vf-dimension-summary"
          : "multidim-vf-summary multidim-vf-node-summary"
    });

    const chevronEl = summaryEl.createSpan({ cls: "multidim-vf-chevron" });
    setIcon(chevronEl, "chevron-right");
    const iconEl = summaryEl.createSpan({ cls: "multidim-vf-summary-icon" });
    renderFlexibleIcon(iconEl, getPathIcon(config, node.path), "folder");
    summaryEl.createSpan({
      cls: "multidim-vf-summary-name",
      text: node.name
    });

    const count = uniqueStrings([
      ...node.filePaths,
      ...node.files.map((file) => file.path)
    ]).length;
    summaryEl.createSpan({
      cls: "multidim-vf-summary-count",
      text: String(count)
    });

    this.attachDropHandlers(summaryEl, config, node);

    if (config.type === "path") {
      summaryEl.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.showPathNodeMenu(event, config, node);
      });
    }

    const childrenEl = detailsEl.createDiv({ cls: "multidim-vf-children" });
    const children = sortNodes(Array.from(node.children.values()), config);
    for (const child of children) {
      this.renderNode(childrenEl, config, child);
    }

    const files = sortFiles(uniqueFiles(node.files), config);
    for (const file of files) {
      this.renderFile(childrenEl, file);
    }
  }

  private renderFile(parentEl: HTMLElement, file: TFile): void {
    const fileEl = parentEl.createDiv({ cls: "multidim-vf-file" });
    fileEl.draggable = true;
    fileEl.title = file.path;
    fileEl.dataset.path = file.path;

    fileEl.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData(DATA_TRANSFER_FILE_PATH, file.path);
      event.dataTransfer?.setData("text/plain", file.path);
    });

    const iconEl = fileEl.createSpan({ cls: "multidim-vf-file-icon" });
    renderFlexibleIcon(iconEl, "file-text", "file-text");
    fileEl.createSpan({
      cls: "multidim-vf-file-name",
      text: file.basename
    });
    fileEl.addEventListener("click", async () => {
      await this.app.workspace.getLeaf(false).openFile(file);
    });
  }

  private attachDropHandlers(
    targetEl: HTMLElement,
    config: VirtualDimensionConfig,
    node: VirtualTreeNode
  ): void {
    targetEl.addEventListener("dragover", (event) => {
      event.preventDefault();
      targetEl.classList.add("is-drop-target");
    });
    targetEl.addEventListener("dragleave", () => {
      targetEl.classList.remove("is-drop-target");
    });
    targetEl.addEventListener("drop", async (event) => {
      event.preventDefault();
      targetEl.classList.remove("is-drop-target");

      const filePath = readDraggedMarkdownPath(this.app, event);
      if (!filePath) {
        new Notice(this.plugin.t("missingDraggedPath"));
        return;
      }

      const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
      if (!(abstractFile instanceof TFile) || abstractFile.extension !== "md") {
        new Notice(this.plugin.t("markdownOnly"));
        return;
      }

      await this.writeFileToNode(abstractFile, config, node);
    });
  }

  private showPathNodeMenu(
    event: MouseEvent,
    config: VirtualDimensionConfig,
    node: VirtualTreeNode
  ): void {
    const menu = new Menu();

    menu.addItem((item) =>
      item
        .setTitle(this.plugin.t("contextChangeIcon"))
        .setIcon("palette")
        .onClick(() => {
          new TextPromptModal(
            this.app,
            this.plugin.t("contextChangeIcon"),
            this.plugin.t("promptIcon"),
            getPathIcon(config, node.path) || "",
            this.plugin.t("confirmAction"),
            this.plugin.t("cancelAction"),
            async (value) => {
              await this.plugin.setPathIcon(config.id, node.path, value);
              this.requestRender(0);
            }
          ).open();
        })
    );

    menu.addItem((item) =>
      item
        .setTitle(this.plugin.t("contextRenameCategory"))
        .setIcon("pencil")
        .onClick(() => {
          const filePaths = Array.from(node.filePaths);
          new TextPromptModal(
            this.app,
            this.plugin.t("contextRenameCategory"),
            this.plugin.t("promptRenameCategory"),
            node.name,
            this.plugin.t("confirmAction"),
            this.plugin.t("cancelAction"),
            async (value) => {
              await this.plugin.renameCategory(
                config.id,
                node.path,
                value,
                filePaths
              );
              this.requestRender(0);
            }
          ).open();
        })
    );

    menu.addItem((item) =>
      item
        .setTitle(this.plugin.t("contextCreateSubcategory"))
        .setIcon("folder-plus")
        .onClick(() => {
          new TextPromptModal(
            this.app,
            this.plugin.t("contextCreateSubcategory"),
            this.plugin.t("promptSubcategory"),
            "",
            this.plugin.t("confirmAction"),
            this.plugin.t("cancelAction"),
            async (value) => {
              const fullPath = joinPath(
                [node.path, value],
                config.separator || DEFAULT_PATH_SEPARATOR
              );
              const didAdd = await this.plugin.addManualPath(config.id, fullPath);
              if (didAdd) {
                this.requestRender(0);
              }
            }
          ).open();
        })
    );

    menu.addItem((item) =>
      item
        .setTitle(this.plugin.t("contextDeleteCategory"))
        .setIcon("trash-2")
        .onClick(() => {
          const filePaths = Array.from(node.filePaths);
          new ConfirmModal(
            this.app,
            this.plugin.t("contextDeleteCategory"),
            this.plugin.t("confirmDeleteCategory", {
              path: node.path,
              count: filePaths.length,
              property: config.property
            }),
            this.plugin.t("confirmAction"),
            this.plugin.t("cancelAction"),
            async () => {
              await this.plugin.deleteCategory(config.id, node.path, filePaths);
              this.requestRender(0);
            }
          ).open();
        })
    );

    menu.showAtMouseEvent(event);
  }

  private async writeFileToNode(
    file: TFile,
    config: VirtualDimensionConfig,
    node: VirtualTreeNode
  ): Promise<void> {
    const value =
      config.type === "date" ? normalizeDateDropValue(node.path) : node.path;

    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        writeFrontmatterValue(
          frontmatter as FrontmatterRecord,
          config.property,
          value,
          config.writeMode
        );
      });
      new Notice(
        this.plugin.t("updatedProperty", {
          file: file.basename,
          property: config.property,
          value
        })
      );
      this.requestRender();
    } catch (error) {
      console.error(
        "MultiDim Virtual Folders: failed to update frontmatter",
        { file: file.path, property: config.property, value },
        error
      );
      new Notice(this.plugin.t("updateFailed", { property: config.property }));
    }
  }
}

class TextPromptModal extends Modal {
  constructor(
    app: App,
    private readonly title: string,
    private readonly message: string,
    private readonly initialValue: string,
    private readonly confirmText: string,
    private readonly cancelText: string,
    private readonly onSubmit: (value: string) => Promise<void> | void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("multidim-vf-modal");

    contentEl.createEl("h2", { text: this.title });
    contentEl.createDiv({
      cls: "multidim-vf-modal-message",
      text: this.message
    });

    const inputEl = contentEl.createEl("input", {
      cls: "multidim-vf-modal-input",
      attr: { type: "text" }
    });
    inputEl.value = this.initialValue;

    const buttonRowEl = contentEl.createDiv({ cls: "multidim-vf-modal-buttons" });
    const cancelButtonEl = buttonRowEl.createEl("button", {
      cls: "mod-muted",
      text: this.cancelText
    });
    cancelButtonEl.type = "button";
    const confirmButtonEl = buttonRowEl.createEl("button", {
      cls: "mod-cta",
      text: this.confirmText
    });
    confirmButtonEl.type = "button";

    const submit = async () => {
      await this.onSubmit(inputEl.value);
      this.close();
    };

    cancelButtonEl.addEventListener("click", () => this.close());
    confirmButtonEl.addEventListener("click", () => {
      void submit();
    });
    inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void submit();
      }
    });

    window.setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class ConfirmModal extends Modal {
  constructor(
    app: App,
    private readonly title: string,
    private readonly message: string,
    private readonly confirmText: string,
    private readonly cancelText: string,
    private readonly onConfirm: () => Promise<void> | void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("multidim-vf-modal");

    contentEl.createEl("h2", { text: this.title });
    contentEl.createDiv({
      cls: "multidim-vf-modal-message",
      text: this.message
    });

    const buttonRowEl = contentEl.createDiv({ cls: "multidim-vf-modal-buttons" });
    const cancelButtonEl = buttonRowEl.createEl("button", {
      cls: "mod-muted",
      text: this.cancelText
    });
    cancelButtonEl.type = "button";
    const confirmButtonEl = buttonRowEl.createEl("button", {
      cls: "mod-warning",
      text: this.confirmText
    });
    confirmButtonEl.type = "button";

    cancelButtonEl.addEventListener("click", () => this.close());
    confirmButtonEl.addEventListener("click", async () => {
      await this.onConfirm();
      this.close();
    });

    window.setTimeout(() => {
      confirmButtonEl.focus();
    }, 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class MultiDimVirtualFoldersSettingTab extends PluginSettingTab {
  private readonly editingDimensionIds = new Set<string>();
  private readonly dimensionDrafts = new Map<string, VirtualDimensionConfig>();
  private openIconPickerDimensionId: string | null = null;
  private iconPickerTab: IconPresetGroup = "emoji";

  constructor(
    app: App,
    private readonly plugin: MultiDimVirtualFoldersPlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: this.plugin.t("appName") });

    new Setting(containerEl)
      .setName(this.plugin.t("settingsLanguageName"))
      .setDesc(this.plugin.t("settingsLanguageDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("zh", this.plugin.t("languageZh"))
          .addOption("en", this.plugin.t("languageEn"))
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = normalizeLanguage(value);
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName(this.plugin.t("defaultOpenPosition"))
      .setDesc(this.plugin.t("defaultOpenPositionDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("left", this.plugin.t("leftSubtitle"))
          .addOption("right", this.plugin.t("rightSubtitle"))
          .addOption("both", this.plugin.t("bothSide"))
          .setValue(this.plugin.settings.defaultViewSide)
          .onChange(async (value) => {
            this.plugin.settings.defaultViewSide = normalizeDefaultOpenSide(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(this.plugin.t("dimensionsName"))
      .setDesc(this.plugin.t("dimensionsDesc"))
      .addButton((button) =>
        button
          .setButtonText(this.plugin.t("addPathDimension"))
          .setCta()
          .onClick(async () => {
            this.plugin.settings.dimensions.push(
              createNewDimension(
                "path",
                this.plugin.settings.dimensions,
                this.plugin.settings.language
              )
            );
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((button) =>
        button.setButtonText(this.plugin.t("addDateDimension")).onClick(async () => {
          this.plugin.settings.dimensions.push(
            createNewDimension(
              "date",
              this.plugin.settings.dimensions,
              this.plugin.settings.language
            )
          );
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.dimensions.length === 0) {
      containerEl.createDiv({
        cls: "multidim-vf-setting-empty",
        text: this.plugin.t("noDimensions")
      });
      return;
    }

    this.plugin.settings.dimensions.forEach((dimension, index) => {
      this.renderDimensionSettings(containerEl, dimension, index);
    });
  }

  private startEditingDimension(dimension: VirtualDimensionConfig): void {
    this.editingDimensionIds.add(dimension.id);
    this.dimensionDrafts.set(dimension.id, cloneDimension(dimension));
    this.openIconPickerDimensionId = null;
    this.display();
  }

  private cancelEditingDimension(dimensionId: string): void {
    this.editingDimensionIds.delete(dimensionId);
    this.dimensionDrafts.delete(dimensionId);
    if (this.openIconPickerDimensionId === dimensionId) {
      this.openIconPickerDimensionId = null;
    }
    this.display();
  }

  private getDimensionDraft(dimension: VirtualDimensionConfig): VirtualDimensionConfig {
    const existingDraft = this.dimensionDrafts.get(dimension.id);

    if (existingDraft) {
      return existingDraft;
    }

    const draft = cloneDimension(dimension);
    this.dimensionDrafts.set(dimension.id, draft);
    return draft;
  }

  private async saveDimensionDraft(
    dimension: VirtualDimensionConfig,
    index: number
  ): Promise<void> {
    const draft = this.dimensionDrafts.get(dimension.id);

    if (!draft) {
      this.editingDimensionIds.delete(dimension.id);
      this.display();
      return;
    }

    const normalizedDimension = normalizeDimension(
      { ...draft, id: dimension.id },
      index
    );

    if (!normalizedDimension) {
      return;
    }

    this.plugin.settings.dimensions[index] = normalizedDimension;
    this.editingDimensionIds.delete(dimension.id);
    this.dimensionDrafts.delete(dimension.id);

    if (this.openIconPickerDimensionId === dimension.id) {
      this.openIconPickerDimensionId = null;
    }

    await this.plugin.saveSettings();
    this.display();
  }

  private renderDimensionSettings(
    containerEl: HTMLElement,
    dimension: VirtualDimensionConfig,
    index: number
  ): void {
    const isEditing = this.editingDimensionIds.has(dimension.id);
    const workingDimension = isEditing
      ? this.getDimensionDraft(dimension)
      : dimension;
    const cardEl = containerEl.createDiv({ cls: "multidim-vf-setting-card" });
    cardEl.classList.add(`is-${workingDimension.type}`);
    cardEl.classList.add(isEditing ? "is-editing" : "is-locked");

    if (!workingDimension.enabled) {
      cardEl.classList.add("is-disabled");
    }

    const applyCardColor = (color: string | undefined) => {
      const normalizedColor = normalizeColor(color);
      cardEl.style.setProperty("--multidim-vf-accent", normalizedColor);
      cardEl.style.setProperty(
        "--multidim-vf-accent-soft",
        toRgbColor(normalizedColor)
      );
    };
    applyCardColor(workingDimension.color);

    const headingEl = cardEl.createDiv({ cls: "multidim-vf-setting-heading" });
    const headingTopEl = headingEl.createDiv({
      cls: "multidim-vf-setting-heading-top"
    });
    const headingMainEl = headingTopEl.createDiv({
      cls: "multidim-vf-setting-heading-main"
    });
    const headingIconEl = headingMainEl.createSpan({
      cls: "multidim-vf-setting-heading-icon"
    });
    renderFlexibleIcon(
      headingIconEl,
      workingDimension.icon,
      getDefaultDimensionIcon(workingDimension)
    );
    const headingTitleEl = headingMainEl.createEl("h3");
    const updateHeadingTitle = () => {
      headingTitleEl.setText(
        `${index + 1}. ${getDimensionTitle(
          workingDimension,
          this.plugin.settings.language
        )}`
      );
    };
    updateHeadingTitle();

    const headingActionsEl = headingTopEl.createDiv({
      cls: "multidim-vf-setting-heading-actions"
    });
    if (isEditing) {
      const saveButtonEl = headingActionsEl.createEl("button", {
        cls: "mod-cta",
        text: this.plugin.t("saveDimension")
      });
      saveButtonEl.type = "button";
      saveButtonEl.addEventListener("click", () => {
        void this.saveDimensionDraft(dimension, index);
      });

      const cancelButtonEl = headingActionsEl.createEl("button", {
        cls: "mod-muted",
        text: this.plugin.t("cancelAction")
      });
      cancelButtonEl.type = "button";
      cancelButtonEl.addEventListener("click", () => {
        this.cancelEditingDimension(dimension.id);
      });
    } else {
      const editButtonEl = headingActionsEl.createEl("button", {
        text: this.plugin.t("editDimension")
      });
      editButtonEl.type = "button";
      editButtonEl.addEventListener("click", () => {
        this.startEditingDimension(dimension);
      });
    }

    headingEl.createDiv({
      cls: "multidim-vf-setting-meta",
      text:
        workingDimension.type === "date"
          ? `${workingDimension.property} ?? ${
              workingDimension.fallbackProperty || this.plugin.t("none")
            }`
          : workingDimension.property
    });

    if (!isEditing) {
      headingEl.createDiv({
        cls: "multidim-vf-setting-lock-note",
        text: this.plugin.t("lockedDimension")
      });
    }

    const basicSectionEl = cardEl.createDiv({
      cls: "multidim-vf-setting-section"
    });
    const dataSectionEl = cardEl.createDiv({
      cls: "multidim-vf-setting-section"
    });
    const actionSectionEl = cardEl.createDiv({
      cls: "multidim-vf-setting-section multidim-vf-setting-section-actions"
    });

    new Setting(basicSectionEl)
      .setName(this.plugin.t("enabled"))
      .addToggle((toggle) =>
        toggle
          .setValue(workingDimension.enabled)
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.enabled = value;
            cardEl.classList.toggle("is-disabled", !value);
          })
      );

    new Setting(basicSectionEl)
      .setName(this.plugin.t("title"))
      .addText((text) =>
        text
          .setValue(getDimensionTitle(workingDimension, this.plugin.settings.language))
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.title = value.trim() || this.plugin.t("untitledDimension");
            updateHeadingTitle();
          })
      );

    this.renderDimensionIconPicker(
      basicSectionEl,
      workingDimension,
      dimension.id,
      isEditing,
      () => {
        renderFlexibleIcon(
          headingIconEl,
          workingDimension.icon,
          getDefaultDimensionIcon(workingDimension)
        );
      }
    );

    new Setting(basicSectionEl)
      .setName(this.plugin.t("colorName"))
      .setDesc(this.plugin.t("colorDesc"))
      .addColorPicker((colorPicker) =>
        colorPicker
          .setValue(normalizeColor(workingDimension.color))
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.color = normalizeColor(value);
            applyCardColor(workingDimension.color);
          })
      );

    new Setting(basicSectionEl)
      .setName(this.plugin.t("type"))
      .setDesc(this.plugin.t("typeDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("date", this.plugin.t("dateDimension"))
          .addOption("path", this.plugin.t("pathDimension"))
          .setValue(workingDimension.type)
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.type = normalizeDimensionType(value);
            if (workingDimension.type === "date") {
              workingDimension.fallbackProperty =
                workingDimension.fallbackProperty || "created";
              workingDimension.dateDisplayMode =
                workingDimension.dateDisplayMode || "year";
              workingDimension.separator = undefined;
              workingDimension.manualPaths = undefined;
              workingDimension.pathIcons = undefined;
            } else {
              workingDimension.separator =
                workingDimension.separator || DEFAULT_PATH_SEPARATOR;
              workingDimension.manualPaths = workingDimension.manualPaths || [];
              workingDimension.pathIcons = workingDimension.pathIcons || {};
              workingDimension.fallbackProperty = undefined;
              workingDimension.dateDisplayMode = undefined;
            }
            this.display();
          })
      );

    new Setting(basicSectionEl)
      .setName(this.plugin.t("displayPosition"))
      .setDesc(this.plugin.t("displayPositionDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("both", this.plugin.t("bothSide"))
          .addOption("left", this.plugin.t("leftOnly"))
          .addOption("right", this.plugin.t("rightOnly"))
          .setValue(workingDimension.displaySide)
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.displaySide = normalizeDisplaySide(value);
          })
      );

    new Setting(dataSectionEl)
      .setName(this.plugin.t("propertyName"))
      .setDesc(this.plugin.t("propertyDesc"))
      .addText((text) =>
        text
          .setValue(workingDimension.property)
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.property = value.trim();
          })
      );

    if (workingDimension.type === "date") {
      new Setting(dataSectionEl)
        .setName(this.plugin.t("dateFallbackProperty"))
        .setDesc(this.plugin.t("dateFallbackPropertyDesc"))
        .addText((text) =>
          text
            .setValue(workingDimension.fallbackProperty || "")
            .setDisabled(!isEditing)
            .onChange((value) => {
              workingDimension.fallbackProperty = value.trim() || undefined;
            })
        );

      new Setting(dataSectionEl)
        .setName(this.plugin.t("dateDisplayModeName"))
        .setDesc(this.plugin.t("dateDisplayModeDesc"))
        .addDropdown((dropdown) =>
          dropdown
            .addOption("year", this.plugin.t("dateDisplayYear"))
            .addOption("month", this.plugin.t("dateDisplayMonth"))
            .addOption("day", this.plugin.t("dateDisplayDay"))
            .setValue(workingDimension.dateDisplayMode || "year")
            .setDisabled(!isEditing)
            .onChange((value) => {
              workingDimension.dateDisplayMode = normalizeDateDisplayMode(value);
            })
        );
    }

    if (workingDimension.type === "path") {
      new Setting(dataSectionEl)
        .setName(this.plugin.t("separatorName"))
        .addText((text) =>
          text
            .setValue(workingDimension.separator || DEFAULT_PATH_SEPARATOR)
            .setDisabled(!isEditing)
            .onChange((value) => {
              workingDimension.separator = value.trim() || DEFAULT_PATH_SEPARATOR;
              workingDimension.manualPaths = normalizeManualPaths(
                workingDimension.manualPaths,
                workingDimension.separator
              );
              workingDimension.pathIcons = normalizePathIcons(
                workingDimension.pathIcons,
                workingDimension.separator
              );
            })
        );

      this.renderManualPathSettings(dataSectionEl, workingDimension, isEditing);
    }

    new Setting(actionSectionEl)
      .setName(this.plugin.t("sortMenuTitle"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("name", this.plugin.t("sortByName"))
          .addOption("created", this.plugin.t("sortByCreated"))
          .addOption("modified", this.plugin.t("sortByModified"))
          .setValue(getDimensionSortBy(workingDimension))
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.sortBy = normalizeSortBy(value);
          })
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("asc", this.plugin.t("sortAsc"))
          .addOption("desc", this.plugin.t("sortDesc"))
          .setValue(getDimensionSortDirection(workingDimension))
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.sortDirection = normalizeSortDirection(value);
          })
      );

    new Setting(actionSectionEl)
      .setName(this.plugin.t("writeMode"))
      .setDesc(this.plugin.t("writeModeDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("replace", "replace")
          .addOption("append", "append")
          .addOption("move", "move")
          .setValue(workingDimension.writeMode)
          .setDisabled(!isEditing)
          .onChange((value) => {
            workingDimension.writeMode = normalizeWriteMode(value);
          })
      );

    new Setting(actionSectionEl)
      .setName(this.plugin.t("orderAndDelete"))
      .addButton((button) =>
        button
          .setButtonText(this.plugin.t("moveUp"))
          .setDisabled(isEditing || index === 0)
          .onClick(async () => {
            moveDimension(this.plugin.settings.dimensions, index, index - 1);
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((button) =>
        button
          .setButtonText(this.plugin.t("moveDown"))
          .setDisabled(
            isEditing || index === this.plugin.settings.dimensions.length - 1
          )
          .onClick(async () => {
            moveDimension(this.plugin.settings.dimensions, index, index + 1);
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((button) =>
        button
          .setButtonText(this.plugin.t("delete"))
          .setDisabled(isEditing)
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.dimensions.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }

  private renderDimensionIconPicker(
    containerEl: HTMLElement,
    dimension: VirtualDimensionConfig,
    dimensionId: string,
    isEditing: boolean,
    onIconChanged: () => void
  ): void {
    const currentIcon = (dimension.icon || getDefaultDimensionIcon(dimension)).trim();
    const isOpen = isEditing && this.openIconPickerDimensionId === dimensionId;

    new Setting(containerEl)
      .setName(this.plugin.t("iconName"))
      .setDesc(this.plugin.t("iconDesc"))
      .addButton((button) => {
        button.setDisabled(!isEditing).onClick(() => {
          this.openIconPickerDimensionId = isOpen ? null : dimensionId;
          this.display();
        });

        const buttonEl = button.buttonEl;
        buttonEl.empty();
        buttonEl.addClass("multidim-vf-icon-select-button");
        buttonEl.setAttribute("aria-expanded", String(isOpen));
        buttonEl.setAttribute("aria-label", this.plugin.t("iconSelect"));
        buttonEl.title = this.plugin.t("iconSelect");

        const previewEl = buttonEl.createSpan({
          cls: "multidim-vf-icon-select-preview"
        });
        renderFlexibleIcon(previewEl, currentIcon, getDefaultDimensionIcon(dimension));

        buttonEl.createSpan({
          cls: "multidim-vf-icon-select-label",
          text: currentIcon || this.plugin.t("iconSelect")
        });

        const chevronEl = buttonEl.createSpan({
          cls: "multidim-vf-icon-select-chevron"
        });
        setIcon(chevronEl, isOpen ? "chevron-up" : "chevron-down");
      });

    if (!isOpen) {
      return;
    }

    const dropdownEl = containerEl.createDiv({
      cls: "multidim-vf-icon-dropdown"
    });
    const tabEl = dropdownEl.createDiv({ cls: "multidim-vf-icon-tabs" });

    for (const group of ICON_PRESET_GROUPS) {
      const tabButtonEl = tabEl.createEl("button", {
        cls: "multidim-vf-icon-tab",
        text: this.plugin.t(
          group === "emoji" ? "iconPickerEmoji" : "iconPickerLucide"
        )
      });
      tabButtonEl.type = "button";

      if (this.iconPickerTab === group) {
        tabButtonEl.classList.add("is-active");
      }

      tabButtonEl.addEventListener("click", () => {
        this.iconPickerTab = group;
        this.openIconPickerDimensionId = dimensionId;
        this.display();
      });
    }

    const gridEl = dropdownEl.createDiv({ cls: "multidim-vf-icon-grid" });
    const activePresets = ICON_PRESETS.filter(
      (preset) => preset.group === this.iconPickerTab
    );

    for (const preset of activePresets) {
      const buttonEl = gridEl.createEl("button", {
        cls: "multidim-vf-icon-option"
      });
      buttonEl.type = "button";
      buttonEl.title = `${preset.label}: ${preset.value}`;
      buttonEl.setAttribute("aria-label", `${preset.label}: ${preset.value}`);

      if (preset.value === currentIcon) {
        buttonEl.classList.add("is-active");
      }

      const iconEl = buttonEl.createSpan({
        cls: "multidim-vf-icon-option-inner"
      });
      renderFlexibleIcon(iconEl, preset.value, preset.value);

      buttonEl.addEventListener("click", () => {
        dimension.icon = preset.value;
        this.openIconPickerDimensionId = null;
        onIconChanged();
        this.display();
      });
    }

    const customEl = dropdownEl.createDiv({ cls: "multidim-vf-icon-custom" });
    customEl.createSpan({
      cls: "multidim-vf-icon-custom-label",
      text: this.plugin.t("iconCustomInput")
    });
    const inputEl = customEl.createEl("input", {
      cls: "multidim-vf-icon-custom-input",
      attr: {
        type: "text",
        placeholder: getDefaultDimensionIcon(dimension)
      }
    });
    inputEl.value = dimension.icon || "";

    const applyCustomIcon = () => {
      dimension.icon = inputEl.value.trim() || undefined;
      this.openIconPickerDimensionId = null;
      onIconChanged();
      this.display();
    };

    inputEl.addEventListener("change", applyCustomIcon);
    inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyCustomIcon();
      }
    });
  }

  private renderManualPathSettings(
    cardEl: HTMLElement,
    dimension: VirtualDimensionConfig,
    isEditing: boolean
  ): void {
    let draftPath = "";
    const separator = dimension.separator || DEFAULT_PATH_SEPARATOR;
    const manualPaths = normalizeManualPaths(dimension.manualPaths, separator);

    new Setting(cardEl)
      .setName(this.plugin.t("temporaryVirtualPaths"))
      .setDesc(this.plugin.t("temporaryVirtualPathsDesc"))
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.t("temporaryVirtualPathPlaceholder"))
          .setDisabled(!isEditing)
          .onChange((value) => {
            draftPath = value;
          })
      )
      .addButton((button) =>
        button
          .setButtonText(this.plugin.t("addTemporaryVirtualPath"))
          .setDisabled(!isEditing)
          .onClick(() => {
            const normalizedPath = normalizeVirtualPath(draftPath, separator);

            if (!normalizedPath) {
              new Notice(this.plugin.t("invalidVirtualPath"));
              return;
            }

            if (manualPaths.includes(normalizedPath)) {
              new Notice(this.plugin.t("virtualPathExists", { path: normalizedPath }));
              return;
            }

            dimension.manualPaths = [...manualPaths, normalizedPath];
            new Notice(this.plugin.t("virtualPathAdded", { path: normalizedPath }));
            this.display();
          })
      );

    for (const path of manualPaths) {
      new Setting(cardEl)
        .setName(path)
        .setDesc(this.plugin.t("temporaryBadge"))
        .addButton((button) =>
          button
            .setButtonText(this.plugin.t("delete"))
            .setWarning()
            .setDisabled(!isEditing)
            .onClick(() => {
              dimension.manualPaths = manualPaths.filter(
                (candidate) => candidate !== path
              );
              new Notice(this.plugin.t("virtualPathRemoved", { path }));
              this.display();
            })
        );
    }
  }
}

function buildDimensionTree(app: App, config: VirtualDimensionConfig): DimensionTree {
  const root = createNode("", "", -1, false);
  const files = app.vault.getMarkdownFiles();

  for (const file of files) {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter as
      | FrontmatterRecord
      | undefined;

    if (config.type === "date") {
      const dateValue = readDateValue(frontmatter, config);
      if (!dateValue) {
        continue;
      }
      const segments = dateSegments(dateValue, config.dateDisplayMode || "year");
      if (segments.length > 0) {
        addFileToTree(root, segments, file, false, DEFAULT_PATH_SEPARATOR);
      }
      continue;
    }

    const paths = readPathValues(
      frontmatter?.[config.property],
      config.separator || DEFAULT_PATH_SEPARATOR
    );

    for (const path of paths) {
      addFileToTree(
        root,
        splitVirtualPath(path, config.separator || DEFAULT_PATH_SEPARATOR),
        file,
        false,
        config.separator || DEFAULT_PATH_SEPARATOR
      );
    }
  }

  if (config.type === "path") {
    const separator = config.separator || DEFAULT_PATH_SEPARATOR;
    for (const manualPath of normalizeManualPaths(config.manualPaths, separator)) {
      addManualPathToTree(root, splitVirtualPath(manualPath, separator), separator);
    }
  }

  return { config, root };
}

function createNode(
  name: string,
  path: string,
  depth: number,
  isManual: boolean
): VirtualTreeNode {
  return {
    name,
    path,
    depth,
    children: new Map(),
    files: [],
    filePaths: new Set(),
    isManual
  };
}

function addFileToTree(
  root: VirtualTreeNode,
  segments: string[],
  file: TFile,
  isManual: boolean,
  separator: string
): void {
  let node = root;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const path = joinPath(segments.slice(0, index + 1), separator);
    let child = node.children.get(segment);

    if (!child) {
      child = createNode(segment, path, index, isManual);
      node.children.set(segment, child);
    }

    child.filePaths.add(file.path);
    node = child;
  }

  node.files.push(file);
}

function addManualPathToTree(
  root: VirtualTreeNode,
  segments: string[],
  separator: string
): void {
  let node = root;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const path = joinPath(segments.slice(0, index + 1), separator);
    let child = node.children.get(segment);

    if (!child) {
      child = createNode(segment, path, index, true);
      node.children.set(segment, child);
    }

    child.isManual = child.isManual || true;
    node = child;
  }
}

function getViewTypeForSide(side: SidebarSide): string {
  return side === "left" ? VIEW_TYPE_LEFT : VIEW_TYPE_RIGHT;
}

function getAllViewTypes(): string[] {
  return [VIEW_TYPE_LEFT, VIEW_TYPE_RIGHT];
}

function createDefaultSettings(): MultiDimVirtualFoldersSettings {
  return {
    language: "zh",
    defaultViewSide: "left",
    dimensions: DEFAULT_DIMENSIONS.map(cloneDimension)
  };
}

function normalizeSettings(
  rawSettings: RawSettings | null
): MultiDimVirtualFoldersSettings {
  if (!rawSettings) {
    return createDefaultSettings();
  }

  if (Array.isArray(rawSettings.dimensions)) {
    const dimensions = rawSettings.dimensions
      .map((dimension, index) => normalizeDimension(dimension, index))
      .filter((dimension): dimension is VirtualDimensionConfig => Boolean(dimension));

    return {
      language: normalizeLanguage(rawSettings.language),
      defaultViewSide: normalizeDefaultOpenSide(rawSettings.defaultViewSide),
      dimensions
    };
  }

  return migrateLegacySettings(rawSettings);
}

function migrateLegacySettings(rawSettings: LegacySettings): MultiDimVirtualFoldersSettings {
  const separator = rawSettings.pathSeparator || DEFAULT_PATH_SEPARATOR;
  const dimensions = DEFAULT_DIMENSIONS.map(cloneDimension);

  dimensions[0].enabled = rawSettings.enableDate ?? true;
  dimensions[0].property = rawSettings.dateProperty || "catalog_date";
  dimensions[0].fallbackProperty = rawSettings.dateFallbackProperty || "created";

  dimensions[1].enabled = rawSettings.enableProject ?? true;
  dimensions[1].property = rawSettings.projectProperty || "project_path";
  dimensions[1].separator = separator;

  dimensions[2].enabled = rawSettings.enableSource ?? true;
  dimensions[2].property = rawSettings.sourceProperty || "source_path";
  dimensions[2].separator = separator;

  return {
    language: normalizeLanguage(rawSettings.language),
    defaultViewSide: "left",
    dimensions
  };
}

function normalizeDimension(
  rawDimension: Partial<VirtualDimensionConfig>,
  index: number
): VirtualDimensionConfig | null {
  const type = normalizeDimensionType(rawDimension.type);
  const normalizedId = normalizeText(rawDimension.id, `dimension-${index + 1}`);
  const defaultDimension =
    DEFAULT_DIMENSIONS.find((dimension) => dimension.id === normalizedId) ??
    (type === "date" ? DEFAULT_DIMENSIONS[0] : DEFAULT_DIMENSIONS[1]);
  const property = normalizeText(rawDimension.property, defaultDimension.property);

  if (!property) {
    return null;
  }

  return {
    id: normalizedId,
    title: normalizeText(rawDimension.title, defaultDimension.title),
    icon:
      normalizeOptionalText(rawDimension.icon) ||
      defaultDimension.icon ||
      getDefaultDimensionIcon({ ...defaultDimension, type }),
    color: normalizeColor(rawDimension.color, defaultDimension.color || getPaletteColor(index)),
    type,
    property,
    fallbackProperty:
      type === "date"
        ? normalizeOptionalText(rawDimension.fallbackProperty)
        : undefined,
    dateDisplayMode:
      type === "date"
        ? normalizeDateDisplayMode(rawDimension.dateDisplayMode)
        : undefined,
    separator:
      type === "path"
        ? normalizeText(rawDimension.separator, DEFAULT_PATH_SEPARATOR)
        : undefined,
    manualPaths:
      type === "path"
        ? normalizeManualPaths(
            rawDimension.manualPaths,
            normalizeText(rawDimension.separator, DEFAULT_PATH_SEPARATOR)
          )
        : undefined,
    pathIcons:
      type === "path"
        ? normalizePathIcons(
            rawDimension.pathIcons,
            normalizeText(rawDimension.separator, DEFAULT_PATH_SEPARATOR)
          )
        : undefined,
    sortBy: normalizeSortBy(rawDimension.sortBy),
    sortDirection: normalizeSortDirection(
      rawDimension.sortDirection,
      type === "date" ? "desc" : "asc"
    ),
    writeMode: normalizeWriteMode(rawDimension.writeMode),
    enabled: rawDimension.enabled !== false,
    displaySide: normalizeDisplaySide(rawDimension.displaySide)
  };
}

function cloneDimension(dimension: VirtualDimensionConfig): VirtualDimensionConfig {
  return {
    ...dimension,
    manualPaths: dimension.manualPaths ? [...dimension.manualPaths] : undefined,
    pathIcons: dimension.pathIcons ? { ...dimension.pathIcons } : undefined
  };
}

function createNewDimension(
  type: VirtualDimensionType,
  existingDimensions: VirtualDimensionConfig[],
  language: Language
): VirtualDimensionConfig {
  const id = createUniqueDimensionId(type, existingDimensions);
  const nextNumber = existingDimensions.length + 1;

  if (type === "date") {
    return {
      id,
      title: translate(language, "newDateDimension", { number: nextNumber }),
      icon: "calendar-plus",
      color: getPaletteColor(nextNumber - 1),
      type: "date",
      property: `custom_date_${nextNumber}`,
      fallbackProperty: "created",
      writeMode: "replace",
      enabled: true,
      displaySide: "both",
      dateDisplayMode: "year",
      sortBy: "name",
      sortDirection: "desc"
    };
  }

  return {
    id,
    title: translate(language, "newPathDimension", { number: nextNumber }),
    icon: "folder-tree",
    color: getPaletteColor(nextNumber - 1),
    type: "path",
    property: `custom_path_${nextNumber}`,
    separator: DEFAULT_PATH_SEPARATOR,
    writeMode: "replace",
    enabled: true,
    displaySide: "both",
    manualPaths: [],
    pathIcons: {},
    sortBy: "name",
    sortDirection: "asc"
  };
}

function createUniqueDimensionId(
  type: VirtualDimensionType,
  existingDimensions: VirtualDimensionConfig[]
): string {
  const existingIds = new Set(existingDimensions.map((dimension) => dimension.id));
  let index = existingDimensions.length + 1;
  let id = `${type}-${index}`;

  while (existingIds.has(id)) {
    index += 1;
    id = `${type}-${index}`;
  }

  return id;
}

function getDimensionTitle(
  dimension: VirtualDimensionConfig,
  language: Language
): string {
  if (dimension.title?.trim()) {
    return dimension.title.trim();
  }

  if (dimension.id === "date") {
    return translate(language, "defaultDateTitle");
  }

  if (dimension.id === "project") {
    return translate(language, "defaultProjectTitle");
  }

  if (dimension.id === "source") {
    return translate(language, "defaultSourceTitle");
  }

  return translate(language, "untitledDimension");
}

function getDefaultDimensionIcon(dimension: VirtualDimensionConfig): string {
  if (dimension.type === "date") {
    return "calendar-days";
  }

  if (dimension.id === "project") {
    return "folder-tree";
  }

  if (dimension.id === "source") {
    return "archive";
  }

  return "folder-tree";
}

function translate(
  language: Language,
  key: TranslationKey,
  replacements?: Record<string, string | number>
): string {
  const dictionary = TRANSLATIONS[language] ?? TRANSLATIONS.zh;
  let text = dictionary[key] ?? TRANSLATIONS.zh[key] ?? key;

  if (replacements) {
    for (const [replacementKey, value] of Object.entries(replacements)) {
      text = text.split(`{${replacementKey}}`).join(String(value));
    }
  }

  return text;
}

function normalizeLanguage(value: unknown): Language {
  return value === "en" ? "en" : "zh";
}

function normalizeSidebarSide(value: unknown): SidebarSide {
  return value === "right" ? "right" : "left";
}

function normalizeDefaultOpenSide(value: unknown): DefaultOpenSide {
  if (value === "left" || value === "right" || value === "both") {
    return value;
  }
  return "left";
}

function normalizeDisplaySide(value: unknown): DimensionDisplaySide {
  if (value === "left" || value === "right" || value === "both") {
    return value;
  }
  return "both";
}

function normalizeDimensionType(value: unknown): VirtualDimensionType {
  return value === "date" ? "date" : "path";
}

function normalizeDateDisplayMode(value: unknown): DateDisplayMode {
  if (value === "month" || value === "day" || value === "year") {
    return value;
  }
  return "year";
}

function normalizeSortBy(value: unknown): SortBy {
  if (value === "created" || value === "modified" || value === "name") {
    return value;
  }
  return "name";
}

function normalizeSortDirection(
  value: unknown,
  fallback: SortDirection = "asc"
): SortDirection {
  if (value === "asc" || value === "desc") {
    return value;
  }
  return fallback;
}

function normalizeWriteMode(value: unknown): WriteMode {
  if (value === "append" || value === "move" || value === "replace") {
    return value;
  }
  return "replace";
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim() || fallback;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.trim() || undefined;
}

function normalizeColor(value: unknown, fallback = DIMENSION_COLOR_PALETTE[0]): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

function normalizeVirtualPath(value: unknown, separator: string): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const segments = splitVirtualPath(value, separator);
  if (segments.length === 0) {
    return null;
  }

  return joinPath(segments, separator || DEFAULT_PATH_SEPARATOR);
}

function normalizeManualPaths(value: unknown, separator: string): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedPaths = value
    .map((path) => normalizeVirtualPath(path, separator))
    .filter((path): path is string => Boolean(path));

  return uniqueStrings(normalizedPaths);
}

function normalizePathIcons(
  value: unknown,
  separator: string
): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const pathIcons: Record<string, string> = {};
  for (const [rawPath, rawIcon] of Object.entries(value)) {
    const path = normalizeVirtualPath(rawPath, separator);
    if (path && typeof rawIcon === "string" && rawIcon.trim()) {
      pathIcons[path] = rawIcon.trim();
    }
  }

  return pathIcons;
}

function splitVirtualPath(value: string, separator: string): string[] {
  const normalizedSeparator = separator || DEFAULT_PATH_SEPARATOR;
  return value
    .split(normalizedSeparator)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function joinPath(segments: string[], separator: string): string {
  const cleanSegments = segments
    .flatMap((segment) => splitVirtualPath(segment, separator))
    .filter(Boolean);
  return cleanSegments.join(separator || DEFAULT_PATH_SEPARATOR);
}

function getPaletteColor(index: number): string {
  return DIMENSION_COLOR_PALETTE[index % DIMENSION_COLOR_PALETTE.length];
}

function getNodeColor(
  config: VirtualDimensionConfig,
  node: VirtualTreeNode
): string {
  if (!node.path) {
    return normalizeColor(config.color);
  }

  const seed = `${config.id}:${node.path}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return NODE_COLOR_PALETTE[hash % NODE_COLOR_PALETTE.length];
}

function toRgbColor(color: string): string {
  const normalized = normalizeColor(color);
  const hex = normalized.slice(1);
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return `${red}, ${green}, ${blue}`;
}

function renderFlexibleIcon(
  targetEl: HTMLElement,
  icon: string | undefined,
  fallbackIcon: string
): void {
  const rawIcon = (icon || fallbackIcon).trim();
  const normalizedIcon = rawIcon.startsWith("lucide:")
    ? rawIcon.slice("lucide:".length).trim()
    : rawIcon;

  targetEl.empty();

  if (!normalizedIcon) {
    setIcon(targetEl, fallbackIcon);
    return;
  }

  if (shouldRenderAsTextIcon(normalizedIcon)) {
    targetEl.createSpan({
      cls: "multidim-vf-text-icon",
      text: normalizedIcon
    });
    return;
  }

  setIcon(targetEl, normalizedIcon);

  if (targetEl.childElementCount === 0) {
    targetEl.createSpan({
      cls: "multidim-vf-text-icon",
      text: normalizedIcon
    });
  }
}

function shouldRenderAsTextIcon(icon: string): boolean {
  return !/^[a-zA-Z0-9_-]+$/.test(icon);
}

function readDateValue(
  frontmatter: FrontmatterRecord | undefined,
  config: VirtualDimensionConfig
): string | null {
  const primary = normalizeDateString(frontmatter?.[config.property]);
  if (primary) {
    return primary;
  }

  if (config.fallbackProperty) {
    return normalizeDateString(frontmatter?.[config.fallbackProperty]);
  }

  return null;
}

function normalizeDateString(value: unknown): string | null {
  if (typeof value === "string") {
    const match = value.match(/\d{4}-\d{1,2}-\d{1,2}/);
    if (match) {
      const [year, month, day] = match[0].split("-");
      return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    const monthMatch = value.match(/\d{4}-\d{1,2}/);
    if (monthMatch) {
      const [year, month] = monthMatch[0].split("-");
      return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-01`;
    }
    const yearMatch = value.match(/\d{4}/);
    if (yearMatch) {
      return `${yearMatch[0]}-01-01`;
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = String(value.getFullYear()).padStart(4, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
}

function dateSegments(value: string, mode: DateDisplayMode): string[] {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return [];
  }

  const monthLabel = `${year}-${month}`;
  const dayLabel = `${year}-${month}-${day}`;

  if (mode === "day") {
    return [dayLabel];
  }

  if (mode === "month") {
    return [monthLabel, dayLabel];
  }

  return [year, monthLabel, dayLabel];
}

function normalizeDateDropValue(path: string): string {
  const segments = path.split(DEFAULT_PATH_SEPARATOR);
  const last = segments[segments.length - 1] || path;

  if (/^\d{4}-\d{2}-\d{2}$/.test(last)) {
    return last;
  }

  if (/^\d{4}-\d{2}$/.test(last)) {
    return `${last}-01`;
  }

  if (/^\d{4}$/.test(last)) {
    return `${last}-01-01`;
  }

  return last;
}

function readPathValues(value: unknown, separator: string): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(
      value
        .map((item) => normalizeVirtualPath(String(item), separator))
        .filter((item): item is string => Boolean(item))
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    return uniqueStrings(
      trimmed
        .split(/\n|,/)
        .map((item) => normalizeVirtualPath(item, separator))
        .filter((item): item is string => Boolean(item))
    );
  }

  return [];
}

function getPathIcon(
  config: VirtualDimensionConfig,
  path: string
): string | undefined {
  if (config.type !== "path") {
    return config.icon || getDefaultDimensionIcon(config);
  }

  const pathIcons = normalizePathIcons(
    config.pathIcons,
    config.separator || DEFAULT_PATH_SEPARATOR
  );
  return pathIcons[path] || config.icon || getDefaultDimensionIcon(config);
}

function writeFrontmatterValue(
  frontmatter: FrontmatterRecord,
  property: string,
  value: string,
  writeMode: WriteMode
): void {
  if (writeMode === "append") {
    const existing = frontmatter[property];
    if (Array.isArray(existing)) {
      frontmatter[property] = uniqueStrings([...existing.map(String), value]);
      return;
    }

    if (typeof existing === "string" && existing.trim()) {
      frontmatter[property] = uniqueStrings([existing.trim(), value]);
      return;
    }
  }

  frontmatter[property] = value;
}

function renamePathCategoryInFrontmatter(
  frontmatter: FrontmatterRecord,
  property: string,
  oldPath: string,
  newPath: string,
  separator: string
): void {
  const existing = frontmatter[property];

  if (Array.isArray(existing)) {
    frontmatter[property] = uniqueStrings(
      existing.map((value) =>
        renamePathCategoryValue(String(value), oldPath, newPath, separator)
      )
    );
    return;
  }

  if (typeof existing === "string") {
    const pathValues = readPathValues(existing, separator);

    if (pathValues.length > 1) {
      frontmatter[property] = uniqueStrings(
        pathValues.map((value) =>
          renamePathCategoryValue(value, oldPath, newPath, separator)
        )
      );
      return;
    }

    frontmatter[property] = renamePathCategoryValue(
      existing,
      oldPath,
      newPath,
      separator
    );
  }
}

function renamePathCategoryValue(
  rawValue: string,
  oldPath: string,
  newPath: string,
  separator: string
): string {
  const normalizedValue = normalizeVirtualPath(rawValue, separator);

  if (!normalizedValue || !isPathInCategory(normalizedValue, oldPath, separator)) {
    return rawValue;
  }

  return replacePathCategoryPrefix(
    normalizedValue,
    oldPath,
    newPath,
    separator
  );
}

function removePathCategoryFromFrontmatter(
  frontmatter: FrontmatterRecord,
  property: string,
  categoryPath: string,
  separator: string
): void {
  const existing = frontmatter[property];

  if (Array.isArray(existing)) {
    const nextValues = existing
      .map(String)
      .filter((value) => !isPathInCategory(value, categoryPath, separator));
    if (nextValues.length > 0) {
      frontmatter[property] = nextValues;
    } else {
      delete frontmatter[property];
    }
    return;
  }

  if (
    typeof existing === "string" &&
    isPathInCategory(existing, categoryPath, separator)
  ) {
    delete frontmatter[property];
  }
}

function buildRenamedCategoryPath(
  oldPath: string | null,
  rawNewName: string,
  separator: string
): string | null {
  if (!oldPath) {
    return null;
  }

  const newNameSegments = splitVirtualPath(rawNewName, separator);
  if (newNameSegments.length !== 1) {
    return null;
  }

  const oldSegments = splitVirtualPath(oldPath, separator);
  if (oldSegments.length === 0) {
    return null;
  }

  oldSegments[oldSegments.length - 1] = newNameSegments[0];
  return joinPath(oldSegments, separator);
}

function renamePathCategoryList(
  value: unknown,
  oldPath: string,
  newPath: string,
  separator: string
): string[] {
  return uniqueStrings(
    normalizeManualPaths(value, separator).map((path) =>
      renamePathCategoryValue(path, oldPath, newPath, separator)
    )
  );
}

function renamePathIconCategory(
  pathIcons: Record<string, string> | undefined,
  oldPath: string,
  newPath: string,
  separator: string
): Record<string, string> {
  const normalizedPathIcons = normalizePathIcons(pathIcons, separator);
  const nextIcons: Record<string, string> = {};

  for (const [path, icon] of Object.entries(normalizedPathIcons)) {
    const nextPath = renamePathCategoryValue(path, oldPath, newPath, separator);
    nextIcons[nextPath] = icon;
  }

  return nextIcons;
}

function removePathIconCategory(
  pathIcons: Record<string, string> | undefined,
  categoryPath: string,
  separator: string
): Record<string, string> {
  const normalizedPathIcons = normalizePathIcons(pathIcons, separator);
  const nextIcons: Record<string, string> = {};

  for (const [path, icon] of Object.entries(normalizedPathIcons)) {
    if (!isPathInCategory(path, categoryPath, separator)) {
      nextIcons[path] = icon;
    }
  }

  return nextIcons;
}

function replacePathCategoryPrefix(
  path: string,
  oldPath: string,
  newPath: string,
  separator: string
): string {
  if (path === oldPath) {
    return newPath;
  }

  if (path.startsWith(`${oldPath}${separator}`)) {
    return `${newPath}${path.slice(oldPath.length)}`;
  }

  return path;
}

function isPathInCategory(
  path: string,
  categoryPath: string,
  separator: string
): boolean {
  const normalizedPath = normalizeVirtualPath(path, separator);
  const normalizedCategory = normalizeVirtualPath(categoryPath, separator);

  if (!normalizedPath || !normalizedCategory) {
    return false;
  }

  return (
    normalizedPath === normalizedCategory ||
    normalizedPath.startsWith(`${normalizedCategory}${separator}`)
  );
}

function readDraggedMarkdownPath(app: App, event: DragEvent): string | null {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return lastKnownDraggedMarkdownPath;
  }

  const typeCandidates = Array.from(dataTransfer.types)
    .flatMap((type) => {
      try {
        return splitCandidateDragData(dataTransfer.getData(type));
      } catch {
        return [];
      }
    });

  const candidates = uniqueStrings([
    lastKnownDraggedMarkdownPath || "",
    ...typeCandidates,
    ...[
      dataTransfer.getData(DATA_TRANSFER_FILE_PATH),
      dataTransfer.getData("text/plain"),
      dataTransfer.getData("text/uri-list"),
      dataTransfer.getData("text"),
      dataTransfer.getData("text/html")
    ].flatMap((value) => splitCandidateDragData(value))
  ]);

  for (const candidate of candidates) {
    const resolved = resolveMarkdownPath(app, candidate);
    if (resolved) {
      lastKnownDraggedMarkdownPath = resolved;
      return resolved;
    }
  }

  for (const file of Array.from(dataTransfer.files)) {
    const draggedFile = file as File & { path?: string };
    const resolved = resolveMarkdownPath(app, draggedFile.path || file.name);
    if (resolved) {
      lastKnownDraggedMarkdownPath = resolved;
      return resolved;
    }
  }

  const sourcePath = readMarkdownPathFromDragSource(app, event.target);
  if (sourcePath) {
    lastKnownDraggedMarkdownPath = sourcePath;
    return sourcePath;
  }

  if (candidates.length > 0 || dataTransfer.types.length > 0) {
    console.debug("MultiDim Virtual Folders: unresolved drag data", {
      types: Array.from(dataTransfer.types),
      candidates
    });
  }

  return null;
}

function splitCandidateDragData(value: string): string[] {
  if (!value) {
    return [];
  }

  const decoded = decodeDragCandidate(value);
  const pieces = [value, decoded]
    .flatMap((candidate) => candidate.split(/\r?\n|,/))
    .map((piece) => piece.trim())
    .filter(Boolean);
  const htmlCandidates = extractHtmlDragCandidates(value);
  const jsonCandidates = extractJsonDragCandidates(value);
  const wikilinkCandidates = Array.from(
    value.matchAll(/\[\[([^\]#|]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)
  ).map((match) => match[1].trim());
  const markdownLinkCandidates = Array.from(
    value.matchAll(/\]\(([^)]+)\)/g)
  ).map((match) => match[1].trim());
  const mdMatches = [value, decoded]
    .flatMap((candidate) => candidate.match(/[^\r\n"'<>()[\]]+?\.md/gi) ?? [])
    .map((piece) => piece.trim())
    .filter(Boolean);

  return uniqueStrings([
    ...pieces,
    ...htmlCandidates,
    ...jsonCandidates,
    ...wikilinkCandidates,
    ...markdownLinkCandidates,
    ...mdMatches
  ]);
}

function resolveMarkdownPath(app: App, rawCandidate: string): string | null {
  const candidate = decodeDragCandidate(rawCandidate);
  const variants = uniqueStrings([
    candidate,
    candidate.replace(/\\/g, "/"),
    candidate.replace(/^\/+/, "")
  ]).filter(Boolean);

  for (const variant of variants) {
    const file = app.vault.getAbstractFileByPath(variant);
    if (file instanceof TFile && file.extension === "md") {
      return file.path;
    }
  }

  const adapter = app.vault.adapter;
  if (adapter instanceof FileSystemAdapter) {
    const basePath = adapter.getBasePath().replace(/\\/g, "/");
    for (const variant of variants) {
      const normalized = variant.replace(/\\/g, "/");
      if (normalized.startsWith(`${basePath}/`)) {
        const relativePath = normalized.slice(basePath.length + 1);
        const file = app.vault.getAbstractFileByPath(relativePath);
        if (file instanceof TFile && file.extension === "md") {
          return file.path;
        }
      }
    }
  }

  const basename = variants[0]?.split(/[\\/]/).pop();
  if (basename?.toLowerCase().endsWith(".md")) {
    const matchedFile = app.vault
      .getMarkdownFiles()
      .find((file) => file.name.toLowerCase() === basename.toLowerCase());
    if (matchedFile) {
      return matchedFile.path;
    }
  }

  const extensionlessBasename = basename?.replace(/\.md$/i, "").trim();
  if (extensionlessBasename) {
    const matchedFile = app.vault
      .getMarkdownFiles()
      .find(
        (file) =>
          file.basename.toLowerCase() === extensionlessBasename.toLowerCase()
      );
    if (matchedFile) {
      return matchedFile.path;
    }
  }

  return null;
}

function readMarkdownPathFromDragSource(
  app: App,
  target: EventTarget | null
): string | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const candidates: string[] = [];
  let element: HTMLElement | null = target;
  let depth = 0;

  while (element && depth < 8) {
    for (const attribute of [
      "data-path",
      "data-file-path",
      "data-href",
      "href",
      "aria-label",
      "title"
    ]) {
      const value = element.getAttribute(attribute);
      if (value) {
        candidates.push(value);
      }
    }

    if (element.classList.contains("nav-file-title")) {
      const titleContent = element.querySelector(".nav-file-title-content");
      if (titleContent?.textContent) {
        candidates.push(titleContent.textContent);
      }
    }

    if (element.textContent && element.textContent.trim().length < 260) {
      candidates.push(element.textContent.trim());
    }

    element = element.parentElement;
    depth += 1;
  }

  for (const candidate of uniqueStrings(candidates)) {
    const resolved = resolveMarkdownPath(app, candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function extractHtmlDragCandidates(value: string): string[] {
  const candidates: string[] = [];

  for (const match of value.matchAll(
    /\b(?:href|src|data-path|data-file-path)=["']([^"']+)["']/gi
  )) {
    candidates.push(match[1]);
  }

  return candidates;
}

function extractJsonDragCandidates(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return [];
  }

  try {
    return extractPathLikeValues(JSON.parse(trimmed));
  } catch {
    return [];
  }
}

function extractPathLikeValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractPathLikeValues(item));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const result: string[] = [];
  for (const [key, childValue] of Object.entries(value)) {
    if (/path|file|href|url|link/i.test(key)) {
      result.push(...extractPathLikeValues(childValue));
    } else if (typeof childValue === "object" && childValue !== null) {
      result.push(...extractPathLikeValues(childValue));
    }
  }

  return result;
}

function decodeDragCandidate(rawCandidate: string): string {
  let candidate = rawCandidate.trim();

  if (candidate.startsWith("obsidian://")) {
    try {
      const url = new URL(candidate);
      const fileParam = url.searchParams.get("file");
      if (fileParam) {
        return decodeURIComponent(fileParam);
      }
    } catch {
      return candidate;
    }
  }

  if (candidate.startsWith("file://")) {
    try {
      candidate = decodeURIComponent(new URL(candidate).pathname);
      if (/^\/[a-zA-Z]:\//.test(candidate)) {
        candidate = candidate.slice(1);
      }
    } catch {
      candidate = candidate.replace(/^file:\/+/, "");
    }
  }

  try {
    return decodeURIComponent(candidate);
  } catch {
    return candidate;
  }
}

function sortNodes(
  nodes: VirtualTreeNode[],
  config: VirtualDimensionConfig
): VirtualTreeNode[] {
  const sortBy = getDimensionSortBy(config);
  const direction = getDimensionSortDirection(config);
  const multiplier = direction === "asc" ? 1 : -1;

  return [...nodes].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, undefined, { numeric: true }) * multiplier;
    }

    const aTime = getNodeTime(a, sortBy, direction);
    const bTime = getNodeTime(b, sortBy, direction);
    if (aTime !== bTime) {
      return (aTime - bTime) * multiplier;
    }

    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

function sortFiles(files: TFile[], config: VirtualDimensionConfig): TFile[] {
  const sortBy = getDimensionSortBy(config);
  const multiplier = getDimensionSortDirection(config) === "asc" ? 1 : -1;

  return [...files].sort((a, b) => {
    if (sortBy === "name") {
      return a.basename.localeCompare(b.basename, undefined, { numeric: true }) * multiplier;
    }

    const aTime = sortBy === "created" ? a.stat.ctime : a.stat.mtime;
    const bTime = sortBy === "created" ? b.stat.ctime : b.stat.mtime;
    if (aTime !== bTime) {
      return (aTime - bTime) * multiplier;
    }

    return a.basename.localeCompare(b.basename, undefined, { numeric: true });
  });
}

function getNodeTime(
  node: VirtualTreeNode,
  sortBy: SortBy,
  direction: SortDirection
): number {
  const files = uniqueFiles(node.files);
  for (const child of node.children.values()) {
    files.push(...uniqueFiles(child.files));
  }

  if (files.length === 0) {
    return 0;
  }

  const times = files.map((file) =>
    sortBy === "created" ? file.stat.ctime : file.stat.mtime
  );
  return direction === "asc" ? Math.min(...times) : Math.max(...times);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueFiles(files: TFile[]): TFile[] {
  const seen = new Set<string>();
  const nextFiles: TFile[] = [];

  for (const file of files) {
    if (!seen.has(file.path)) {
      seen.add(file.path);
      nextFiles.push(file);
    }
  }

  return nextFiles;
}

function moveDimension(
  dimensions: VirtualDimensionConfig[],
  fromIndex: number,
  toIndex: number
): void {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= dimensions.length ||
    toIndex >= dimensions.length
  ) {
    return;
  }

  const [dimension] = dimensions.splice(fromIndex, 1);
  dimensions.splice(toIndex, 0, dimension);
}

function getDimensionSortBy(config: VirtualDimensionConfig): SortBy {
  return normalizeSortBy(config.sortBy);
}

function getDimensionSortDirection(config: VirtualDimensionConfig): SortDirection {
  return normalizeSortDirection(
    config.sortDirection,
    config.type === "date" ? "desc" : "asc"
  );
}

function getSortByLabel(
  plugin: MultiDimVirtualFoldersPlugin,
  sortBy: SortBy
): string {
  if (sortBy === "created") {
    return plugin.t("sortByCreated");
  }

  if (sortBy === "modified") {
    return plugin.t("sortByModified");
  }

  return plugin.t("sortByName");
}

function getSortDirectionLabel(
  plugin: MultiDimVirtualFoldersPlugin,
  direction: SortDirection
): string {
  return direction === "asc" ? plugin.t("sortAsc") : plugin.t("sortDesc");
}
