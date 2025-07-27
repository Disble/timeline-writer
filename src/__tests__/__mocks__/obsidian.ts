// Mock Obsidian module for testing
export class Plugin {
  app: unknown;
  manifest: unknown;

  constructor(app: unknown, manifest: unknown) {
    this.app = app;
    this.manifest = manifest;
  }

  onload() {}
  onunload() {}
  addCommand() {}
  addRibbonIcon() {}
  addSettingTab() {}
  registerEvent() {}
  loadData() {}
  saveData() {}
}

export class TFile {
  path: string;
  name: string;
  extension: string;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.extension = this.name.split('.').pop() || '';
  }
}

export class TAbstractFile {
  path: string;
  name: string;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
  }
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
}

export class Setting {
  constructor(_containerEl: unknown) {}
  setName() {
    return this;
  }
  setDesc() {
    return this;
  }
  addText() {
    return this;
  }
  addToggle() {
    return this;
  }
  addSlider() {
    return this;
  }
  addDropdown() {
    return this;
  }
  addButton() {
    return this;
  }
}

export class PluginSettingTab {
  app: unknown;
  plugin: unknown;

  constructor(app: unknown, plugin: unknown) {
    this.app = app;
    this.plugin = plugin;
  }

  display() {}
  hide() {}
}

export class Modal {
  app: unknown;

  constructor(app: unknown) {
    this.app = app;
  }

  open() {}
  close() {}
}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

export class SuggestModal {
  app: unknown;

  constructor(app: unknown) {
    this.app = app;
  }

  getSuggestions() {
    return [];
  }
  renderSuggestion() {}
  onChooseItem() {}
}

export class WorkspaceLeaf {
  workspace: unknown;

  constructor(workspace: unknown) {
    this.workspace = workspace;
  }

  openFile() {}
  getViewState() {
    return {};
  }
  setViewState() {}
}

export class Workspace {
  workspace: unknown;

  constructor() {
    this.workspace = this;
  }

  getActiveFile() {
    return null;
  }
  openLinkText() {}
  onLayoutReady() {}
  onLayoutChange() {}
  onFileOpen() {}
  onFileClose() {}
  onFileRename() {}
  onFileDelete() {}
  onFileCreate() {}
  onFileModify() {}
}

export class Vault {
  constructor() {}

  read() {
    return Promise.resolve('');
  }
  write() {
    return Promise.resolve();
  }
  create() {
    return Promise.resolve();
  }
  delete() {
    return Promise.resolve();
  }
  rename() {
    return Promise.resolve();
  }
  getFiles() {
    return [];
  }
  getAbstractFileByPath() {
    return null;
  }
  on() {}
  off() {}
}

export class MetadataCache {
  constructor() {}

  getFileCache() {
    return null;
  }
  on() {}
  off() {}
}

export class App {
  vault: Vault;
  workspace: Workspace;
  metadataCache: MetadataCache;
  keymap: unknown;
  scope: unknown;
  fileManager: unknown;
  lastEvent: unknown;
  dom: unknown;
  internalPlugins: unknown;

  constructor() {
    this.vault = new Vault();
    this.workspace = new Workspace();
    this.metadataCache = new MetadataCache();
    this.keymap = {};
    this.scope = {};
    this.fileManager = {};
    this.lastEvent = {};
    this.dom = {};
    this.internalPlugins = {};
  }
}
