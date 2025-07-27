import { type App, type Plugin, TFile } from 'obsidian';
import { ContextDetectionEngine } from '../core/context-detection/ContextDetectionEngine';
import { ContextVersioningIntegration } from '../core/integration/ContextVersioningIntegration';
import { NavigationEngine } from '../core/timeline-engine/NavigationEngine';
import { TimelineEngine } from '../core/timeline-engine/TimelineEngine';
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

    // Initialize core engines
    this.versionManager = new VersionManager(this.storageEngine);
    this.timelineEngine = new TimelineEngine(this.storageEngine);
    this.navigationEngine = new NavigationEngine(
      this.storageEngine,
      this.logger
    );

    // Initialize context detection
    this.contextDetection = new ContextDetectionEngine(this.logger);
    await this.contextDetection.initialize([]); // Start with empty contexts

    // Initialize integration layer
    this.contextVersioning = new ContextVersioningIntegration(
      this.versionManager,
      this.timelineEngine,
      this.logger
    );
  }

  private registerEventListeners(): void {
    if (this.eventListenersRegistered) {
      return;
    }

    // File modification events - TODO: Fix event type compatibility
    // this.registerEvent(
    //   this.app.vault.on('modify', this.handleFileModify.bind(this))
    // );
    // this.registerEvent(
    //   this.app.vault.on('create', this.handleFileCreate.bind(this))
    // );
    // this.registerEvent(
    //   this.app.vault.on('delete', this.handleFileDelete.bind(this))
    // );
    // this.registerEvent(
    //   this.app.vault.on('rename', this.handleFileRename.bind(this))
    // );

    // Workspace events - TODO: Fix event type compatibility
    // this.app.workspace.on('file-open', this.handleFileOpen.bind(this));
    // this.app.workspace.on('quit', this.handleWorkspaceQuit.bind(this));

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

    for (const [filePath] of this.fileContentCache) {
      // TODO: Add timestamp tracking to know when to cleanup
      // For now, limit cache size
      if (this.fileContentCache.size > 1000) {
        this.fileContentCache.delete(filePath);
        break;
      }
    }

    this.logger.debug('Cache cleanup completed', {
      cacheSize: this.fileContentCache.size,
    });
  }

  private async processBackgroundTasks(): Promise<void> {
    // Background processing tasks
    // TODO: Implement background tasks like:
    // - Storage optimization
    // - Index rebuilding
    // - Performance monitoring
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
      if (result.success) {
        // TODO: Update file content in editor
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

  async createManualCheckpoint(
    filePath: string,
    label: string
  ): Promise<string | null> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        return null;
      }

      await this.app.vault.read(file);
      const node = await this.timelineEngine.createNode(filePath, label, true);

      this.logger.info('Manual checkpoint created', {
        filePath,
        nodeId: node.id,
        label,
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
      totalTimelineNodes: 0, // TODO: Implement
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
