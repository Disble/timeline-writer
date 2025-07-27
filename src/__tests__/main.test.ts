import TimelineWriterPlugin from '../main';
import { createMockApp } from './setup';
import { App } from 'obsidian';

describe('TimelineWriterPlugin', () => {
  let plugin: TimelineWriterPlugin;
  let mockApp: App;

  beforeEach(() => {
    mockApp = createMockApp() as unknown as App;
    plugin = new TimelineWriterPlugin(mockApp, {
      id: 'timeline-writer',
      name: 'Timeline Writer',
      version: '0.1.0',
      minAppVersion: '1.4.16',
      description: 'Test plugin',
      author: 'Test',
    });

    // Set logger to info level so we can test info messages
    plugin['logger'].setLogLevel('info');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onload', () => {
    it('should load plugin successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await plugin.onload();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loading Timeline Writer plugin')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Timeline Writer plugin loaded successfully')
      );
    });

    it('should add commands', async () => {
      plugin.addCommand = jest.fn();

      await plugin.onload();

      expect(plugin.addCommand).toHaveBeenCalledWith({
        id: 'open-timeline',
        name: 'Open Timeline View',
        callback: expect.any(Function),
      });

      expect(plugin.addCommand).toHaveBeenCalledWith({
        id: 'create-checkpoint',
        name: 'Create Manual Checkpoint',
        callback: expect.any(Function),
      });
    });

    it('should add commands', async () => {
      plugin.addCommand = jest.fn();

      await plugin.onload();

      expect(plugin.addCommand).toHaveBeenCalledWith({
        id: 'open-timeline',
        name: 'Open Timeline View',
        callback: expect.any(Function),
      });

      expect(plugin.addCommand).toHaveBeenCalledWith({
        id: 'create-checkpoint',
        name: 'Create Manual Checkpoint',
        callback: expect.any(Function),
      });
    });

    it('should add ribbon icon', async () => {
      plugin.addRibbonIcon = jest.fn();

      await plugin.onload();

      expect(plugin.addRibbonIcon).toHaveBeenCalledWith(
        'clock',
        'Timeline Writer',
        expect.any(Function)
      );
    });
  });

  describe('settings', () => {
    it('should load default settings', async () => {
      plugin.loadData = jest.fn().mockResolvedValue({});

      await plugin.loadSettings();

      expect(plugin.settings.enableAutoDetection).toBe(true);
      expect(plugin.settings.detectionSensitivity).toBe(0.7);
      expect(plugin.settings.snapshotFrequency).toBe('medium');
    });

    it('should merge loaded settings with defaults', async () => {
      const savedSettings = {
        enableAutoDetection: false,
        detectionSensitivity: 0.5,
      };
      plugin.loadData = jest.fn().mockResolvedValue(savedSettings);

      await plugin.loadSettings();

      expect(plugin.settings.enableAutoDetection).toBe(false);
      expect(plugin.settings.detectionSensitivity).toBe(0.5);
      expect(plugin.settings.snapshotFrequency).toBe('medium'); // Should keep default
    });

    it('should save settings', async () => {
      plugin.saveData = jest.fn();
      plugin.settings.enableAutoDetection = false;

      await plugin.saveSettings();

      expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
    });
  });

  describe('onunload', () => {
    it('should unload plugin cleanly', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await plugin.onunload();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unloading Timeline Writer plugin')
      );
    });
  });
});
