import {
  type App,
  debounce,
  type Plugin,
  type TAbstractFile,
  TFile,
} from 'obsidian';
import { ContextDetectionEngine } from '../core/context-detection/ContextDetectionEngine';
import { ContextVersioningIntegration } from '../core/integration/ContextVersioningIntegration';
import { NavigationEngine } from '../core/timeline-engine/NavigationEngine';
import { TimelineEngine } from '../core/timeline-engine/TimelineEngine';
import { CompressionEngine } from '../core/version-manager/CompressionEngine';
import { DiffEngine } from '../core/version-manager/DiffEngine';
import { VersionManager } from '../core/version-manager/VersionManager';
import { DatabaseManager } from '../data/storage/DatabaseManager';
import { StorageEngine } from '../data/storage/StorageEngine';
import { Logger } from '../utils/logger';

export interface ObsidianIntegrationConfig {
  enableAutoDetection: boolean;
  debounceDelay: number;
  excludePatterns: string[];
  maxFileSize: number;
  enableBackgroundProcessing: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_CONFIG: ObsidianIntegrationConfig = {
  enableAutoDetection: true,
  debounceDelay: 2000, // 2 seconds
  excludePatterns: ['**/.obsidian/**', '**/node_modules/**'],
  maxFileSize: 1024 * 1024, // 1MB
  enableBackgroundProcessing: true,
  logLevel: 'info',
};

export class ObsidianIntegration {
  private app: App;
  private plugin: Plugin;
  private logger: Logger;
  private config: ObsidianIntegrationConfig;
  private dbManager: DatabaseManager;

  // Core systems
  private storageEngine!: StorageEngine;
  private contextDetection!: ContextDetectionEngine;
  private versionManager!: VersionManager;
  private timelineEngine!: TimelineEngine;
  private navigationEngine!: NavigationEngine;
  private contextVersioning!: ContextVersioningIntegration;

  // Event handling
  private debouncedHandlers: Map<string, () => void> = new Map();
  private fileContentCache: Map<string, string> = new Map();
  private processingQueue: Set<string> = new Set();

  // State tracking
  private isInitialized = false;
  private eventListenersRegistered = false;

  constructor(
    app: App,
    plugin: Plugin,
    config: Partial<ObsidianIntegrationConfig> = {}
  ) {
    this.app = app;
    this.plugin = plugin;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = Logger.getInstance();
    this.logger.setLogLevel(this.config.logLevel);

    const pluginPath = this.plugin.manifest.dir ?? '';
    this.dbManager = DatabaseManager.getInstance(this.app, pluginPath);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('ObsidianIntegration already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Timeline Writer integration...');

      // Initialize core systems
      await this.initializeCoreSystem();

      // Register event listeners
      this.registerEventListeners();

      // Setup background processing
      if (this.config.enableBackgroundProcessing) {
        this.setupBackgroundProcessing();
      }

      this.isInitialized = true;
      this.logger.info('Timeline Writer integration initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Timeline Writer integration',
        error
      );
      throw error;
    }
  }

  private async initializeCoreSystem(): Promise<void> {
    // Initialize storage layer
    await this.dbManager.initialize();

    this.storageEngine = new StorageEngine(this.dbManager, this.logger);
    await this.storageEngine.initialize();

    const compressionEngine = new CompressionEngine();
    const diffEngine = new DiffEngine();

    // Initialize core engines
    this.versionManager = new VersionManager(
      this.storageEngine,
      diffEngine,
      compressionEngine,
      this.logger
    );
    this.timelineEngine = new TimelineEngine(this.storageEngine, this.logger);
    this.navigationEngine = new NavigationEngine(
      this.storageEngine,
      this.logger
    );

    // Initialize context detection
    this.contextDetection = new ContextDetectionEngine(this.logger);
    this.contextDetection.initialize([]); // Start with empty contexts

    // Initialize integration layer
    this.contextVersioning = new ContextVersioningIntegration(
      this.versionManager,
      this.timelineEngine,
      this.contextDetection,
      this.logger
    );
  }

  private registerEventListeners(): void {
    if (this.eventListenersRegistered) {
      return;
    }

    this.plugin.registerEvent(
      this.app.vault.on('modify', this.handleFileModify.bind(this))
    );
    this.plugin.registerEvent(
      this.app.vault.on('create', this.handleFileCreate.bind(this))
    );
    this.plugin.registerEvent(
      this.app.vault.on('delete', this.handleFileDelete.bind(this))
    );
    this.plugin.registerEvent(
      this.app.vault.on('rename', this.handleFileRename.bind(this))
    );

    // Workspace events
    this.plugin.registerEvent(
      this.app.workspace.on('file-open', this.handleFileOpen.bind(this))
    );
    this.plugin.registerEvent(
      this.app.workspace.on('quit', this.handleWorkspaceQuit.bind(this))
    );

    this.eventListenersRegistered = true;
    this.logger.debug('Event listeners registered');
  }

  private setupBackgroundProcessing(): void {
    // Setup periodic tasks
    this.plugin.registerInterval(
      window.setInterval(
        () => {
          this.cleanupCaches();
        },
        5 * 60 * 1000
      ) // Every 5 minutes
    );

    this.plugin.registerInterval(
      window.setInterval(() => {
        this.processBackgroundTasks();
      }, 30 * 1000) // Every 30 seconds
    );
  }

  private cleanupCaches(): void {
    // Clean up old file content cache entries
    if (this.fileContentCache.size > 1000) {
      // Simple FIFO cache eviction
      const oldestKey = this.fileContentCache.keys().next().value;
      if (oldestKey) {
        this.fileContentCache.delete(oldestKey);
      }
    }

    this.logger.debug('Cache cleanup completed', {
      cacheSize: this.fileContentCache.size,
    });
  }

  private async processBackgroundTasks(): Promise<void> {
    // Background processing tasks
  }

  private getDebouncedProcess(filePath: string): () => void {
    if (!this.debouncedHandlers.has(filePath)) {
      const debouncedFunc = debounce(
        () => this.processFileChange(filePath),
        this.config.debounceDelay,
        true
      );
      this.debouncedHandlers.set(filePath, debouncedFunc);
    }
    const debouncedHandler = this.debouncedHandlers.get(filePath);
    if (debouncedHandler) {
      return debouncedHandler;
    }
    // This part should ideally not be reached if the logic is correct
    this.logger.error('Could not get or create debounced handler');
    return () => {};
  }

  private async processFileChange(filePath: string): Promise<void> {
    if (this.processingQueue.has(filePath)) {
      this.logger.debug('File is already being processed, skipping.', {
        filePath,
      });
      return;
    }

    this.processingQueue.add(filePath);
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) return;

      const newContent = await this.app.vault.cachedRead(file);
      const oldContent = this.fileContentCache.get(filePath) || '';

      if (newContent === oldContent) {
        this.logger.debug('Content has not changed, skipping processing.', {
          filePath,
        });
        return;
      }

      await this.contextVersioning.processFileChange(
        filePath,
        newContent,
        oldContent
      );
      this.fileContentCache.set(filePath, newContent);
    } catch (error) {
      this.logger.error('Failed to process file in background', error);
    } finally {
      this.processingQueue.delete(filePath);
    }
  }

  private handleFileModify = async (file: TAbstractFile): Promise<void> => {
    if (!(file instanceof TFile) || this.isPathExcluded(file.path)) {
      return;
    }

    this.logger.debug(`File modified: ${file.path}`);
    const debouncedProcess = this.getDebouncedProcess(file.path);
    debouncedProcess();
  };

  private handleFileCreate = async (file: TAbstractFile): Promise<void> => {
    if (!(file instanceof TFile) || this.isPathExcluded(file.path)) {
      return;
    }
    this.logger.info(`File created: ${file.path}`);
    const newContent = await this.app.vault.cachedRead(file);
    await this.contextVersioning.processFileChange(file.path, newContent, '');
    this.fileContentCache.set(file.path, newContent);
  };

  private handleFileDelete = async (file: TAbstractFile): Promise<void> => {
    if (this.isPathExcluded(file.path)) {
      return;
    }
    this.logger.info(`File deleted: ${file.path}`);
    this.fileContentCache.delete(file.path);
    this.debouncedHandlers.delete(file.path);
    await this.contextVersioning.handleFileDeletion(file.path);
  };

  private handleFileRename = async (
    file: TAbstractFile,
    oldPath: string
  ): Promise<void> => {
    if (this.isPathExcluded(file.path) && this.isPathExcluded(oldPath)) {
      return;
    }
    this.logger.info(`File renamed: ${oldPath} -> ${file.path}`);
    // Update caches
    const cachedContent = this.fileContentCache.get(oldPath);
    if (cachedContent !== undefined) {
      this.fileContentCache.set(file.path, cachedContent);
      this.fileContentCache.delete(oldPath);
    }

    const debouncedHandler = this.debouncedHandlers.get(oldPath);
    if (debouncedHandler) {
      this.debouncedHandlers.set(file.path, debouncedHandler);
      this.debouncedHandlers.delete(oldPath);
    }
    await this.contextVersioning.handleFileRename(oldPath, file.path);
  };

  private handleFileOpen = (file: TFile | null): void => {
    if (!file) return;
    this.logger.debug(`File opened: ${file.path}`);
    // Potentially pre-cache or trigger analysis on file open
  };

  private handleWorkspaceQuit = async (): Promise<void> => {
    this.logger.info('Obsidian is quitting. Cleaning up...');
    await this.cleanup();
  };

  private isPathExcluded(path: string): boolean {
    return this.config.excludePatterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*\*/g, '.*') // Convert ** to .*
        .replace(/\*/g, '[^/]*') // Convert * to [^/]*
        .replace(/\?/g, '.') // Convert ? to .
        .replace(/\[/g, '\\[') // Escape [
        .replace(/\]/g, '\\]') // Escape ]
        .replace(/\(/g, '\\(') // Escape (
        .replace(/\)/g, '\\)') // Escape )
        .replace(/\|/g, '\\|') // Escape |
        .replace(/\^/g, '\\^') // Escape ^
        .replace(/\$/g, '\\$') // Escape $
        .replace(/\+/g, '\\+') // Escape +
        .replace(/\{/g, '\\{') // Escape {
        .replace(/\}/g, '\\}') // Escape }
        .replace(/\\/g, '\\\\'); // Escape backslashes

      try {
        const regex = new RegExp(regexPattern);
        return regex.test(path);
      } catch (error) {
        this.logger.warn('Invalid exclude pattern', { pattern, error });
        return false;
      }
    });
  }

  // Public API methods

  async navigateToVersion(filePath: string, nodeId: string): Promise<boolean> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        return false;
      }

      const result = await this.navigationEngine.navigateToNode(
        filePath,
        nodeId
      );
      if (result.success && result.content) {
        await this.app.vault.modify(file, result.content);
        this.logger.info('Navigation successful', {
          filePath,
          nodeId,
          previousNodeId: result.previousNode?.id,
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Navigation failed', error);
      return false;
    }
  }

  async navigateBack(filePath: string): Promise<boolean> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        return false;
      }

      const currentPosition =
        this.navigationEngine.getCurrentPosition(filePath);
      if (!currentPosition) {
        this.logger.debug('No current position found for navigation', {
          filePath,
        });
        return false;
      }

      const currentNode = await this.storageEngine.getNode(currentPosition);
      if (!currentNode || currentNode.parentIds.length === 0) {
        this.logger.debug('No parent node available for navigation back', {
          filePath,
          currentNodeId: currentPosition,
        });
        return false;
      }

      // Navigate to the first parent (most recent)
      const parentNodeId = currentNode.parentIds[0];
      if (!parentNodeId) {
        this.logger.debug('Parent node ID is undefined', {
          filePath,
          currentNodeId: currentPosition,
        });
        return false;
      }
      const success = await this.navigateToVersion(filePath, parentNodeId);

      if (success) {
        this.logger.info('Navigated back successfully', {
          filePath,
          fromNodeId: currentPosition,
          toNodeId: parentNodeId,
        });
      }

      return success;
    } catch (error) {
      this.logger.error('Navigate back failed', error);
      return false;
    }
  }

  async navigateForward(filePath: string): Promise<boolean> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        return false;
      }

      const currentPosition =
        this.navigationEngine.getCurrentPosition(filePath);
      if (!currentPosition) {
        this.logger.debug('No current position found for navigation', {
          filePath,
        });
        return false;
      }

      const currentNode = await this.storageEngine.getNode(currentPosition);
      if (!currentNode || currentNode.childIds.length === 0) {
        this.logger.debug('No child node available for navigation forward', {
          filePath,
          currentNodeId: currentPosition,
        });
        return false;
      }

      // Navigate to the first child (most recent)
      const childNodeId = currentNode.childIds[0];
      if (!childNodeId) {
        this.logger.debug('Child node ID is undefined', {
          filePath,
          currentNodeId: currentPosition,
        });
        return false;
      }
      const success = await this.navigateToVersion(filePath, childNodeId);

      if (success) {
        this.logger.info('Navigated forward successfully', {
          filePath,
          fromNodeId: currentPosition,
          toNodeId: childNodeId,
        });
      }

      return success;
    } catch (error) {
      this.logger.error('Navigate forward failed', error);
      return false;
    }
  }

  async createManualCheckpoint(
    filePath: string,
    label: string
  ): Promise<string | null> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        return null;
      }

      const content = await this.app.vault.read(file);

      // Validate that the file has meaningful content
      const trimmedContent = content.trim();
      if (trimmedContent.length === 0) {
        this.logger.warn('Cannot create checkpoint for empty file', {
          filePath,
        });
        return null;
      }

      // Check for minimum meaningful content (at least 10 characters)
      if (trimmedContent.length < 10) {
        this.logger.warn('File content too small for meaningful checkpoint', {
          filePath,
          contentLength: trimmedContent.length,
        });
        return null;
      }

      const node = await this.contextVersioning.createManualCheckpoint(
        filePath,
        content,
        label
      );

      this.logger.info('Manual checkpoint created', {
        filePath,
        nodeId: node.id,
        label,
        contentLength: content.length,
      });

      return node.id;
    } catch (error) {
      this.logger.error('Failed to create manual checkpoint', error);
      return null;
    }
  }

  async getTimelineForFile(filePath: string): Promise<{
    timeline: unknown;
    statistics: unknown;
    currentPosition: string | undefined;
  } | null> {
    try {
      const timeline = await this.timelineEngine.getTimeline(filePath);
      const statistics =
        await this.navigationEngine.getTimelineStatistics(filePath);

      return {
        timeline,
        statistics,
        currentPosition: this.navigationEngine.getCurrentPosition(filePath),
      };
    } catch (error) {
      this.logger.error('Failed to get timeline for file', error);
      return null;
    }
  }

  updateConfig(newConfig: Partial<ObsidianIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.setLogLevel(this.config.logLevel);
    this.logger.info('Integration config updated', { config: this.config });
  }

  getConfig(): ObsidianIntegrationConfig {
    return { ...this.config };
  }

  async getStatistics(): Promise<{
    filesTracked: number;
    totalSnapshots: number;
    totalTimelineNodes: number;
    cacheSize: number;
    processingQueueSize: number;
  }> {
    const stats = await this.contextVersioning.getStatistics();

    return {
      filesTracked: this.fileContentCache.size,
      totalSnapshots: stats.totalSnapshots,
      totalTimelineNodes: stats.totalNodes,
      cacheSize: this.fileContentCache.size,
      processingQueueSize: this.processingQueue.size,
    };
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Timeline Writer integration...');

    // Clear caches
    this.fileContentCache.clear();
    this.debouncedHandlers.clear();
    this.processingQueue.clear();

    // Close storage
    if (this.storageEngine) {
      await this.storageEngine.close();
    }

    this.isInitialized = false;
    this.eventListenersRegistered = false;

    this.logger.info('Timeline Writer integration cleanup completed');
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
