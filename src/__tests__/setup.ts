// Jest setup file for Timeline Writer
import 'jest';

// Mock Obsidian API
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Mock DOM methods
Object.defineProperty(window, 'HTMLElement', {
  value: class MockHTMLElement {
    innerHTML = '';
    style: Record<string, string> = {};
    setAttribute = jest.fn();
    getAttribute = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    appendChild = jest.fn();
    removeChild = jest.fn();
    createEl = jest.fn();
    empty = jest.fn();
  },
});

// Mock Obsidian specific globals
global.window = global.window || {};
global.document = global.document || {};

// Add any global test utilities here
export const createMockApp = () => ({
  vault: {
    on: jest.fn(),
    off: jest.fn(),
    read: jest.fn(),
    modify: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    getFiles: jest.fn(() => []),
  },
  workspace: {
    on: jest.fn(),
    off: jest.fn(),
    getActiveFile: jest.fn(),
    openLinkText: jest.fn(),
  },
  metadataCache: {
    on: jest.fn(),
    getFileCache: jest.fn(),
  },
});

export const createMockPlugin = () => ({
  app: createMockApp(),
  manifest: {
    id: 'timeline-writer',
    name: 'Timeline Writer',
    version: '0.1.0',
  },
  loadData: jest.fn(),
  saveData: jest.fn(),
  addCommand: jest.fn(),
  addRibbonIcon: jest.fn(),
  addSettingTab: jest.fn(),
  registerEvent: jest.fn(),
});

// Extend Jest matchers if needed
expect.extend({
  // Custom matchers can be added here
});
