import TimelineWriterPlugin from '../main';
import { createMockApp, createMockPlugin } from './setup';

describe('TimelineWriterPlugin', () => {
  let plugin: TimelineWriterPlugin;
  let mockApp: any;

  beforeEach(() => {
    mockApp = createMockApp();
    plugin = new TimelineWriterPlugin(mockApp, {
      id: 'timeline-writer',
      name: 'Timeline Writer',
      version: '0.1.0',
      minAppVersion: '1.4.16',
      description: 'Test plugin',
      author: 'Test',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onload', () => {
    it('should load plugin successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await plugin.onload();
      
      expect(consoleSpy).toHaveBeenCalledWith('Loading Timeline Writer plugin');
      expect(consoleSpy).toHaveBeenCalledWith('Timeline Writer plugin loaded successfully');
    });

    it('should register event handlers', async () => {
      await plugin.onload();
      
      expect(mockApp.vault.on).toHaveBeenCalledWith('modify', expect.any(Function));
      expect(mockApp.vault.on).toHaveBeenCalledWith('create', expect.any(Function));
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

  describe('file event handlers', () => {
    beforeEach(async () => {
      await plugin.onload();
    });

    it('should handle file modifications', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const mockFile = { path: 'test.md' };

      // Simulate file modification
      const modifyHandler = mockApp.vault.on.mock.calls.find(
        call => call[0] === 'modify'
      )?.[1];

      if (modifyHandler) {
        await modifyHandler(mockFile);
        expect(consoleSpy).toHaveBeenCalledWith('File modified:', 'test.md');
      }
    });

    it('should handle file creation', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const mockFile = { path: 'new-file.md' };

      // Simulate file creation
      const createHandler = mockApp.vault.on.mock.calls.find(
        call => call[0] === 'create'
      )?.[1];

      if (createHandler) {
        await createHandler(mockFile);
        expect(consoleSpy).toHaveBeenCalledWith('File created:', 'new-file.md');
      }
    });
  });

  describe('onunload', () => {
    it('should unload plugin cleanly', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await plugin.onunload();
      
      expect(consoleSpy).toHaveBeenCalledWith('Unloading Timeline Writer plugin');
    });
  });
});