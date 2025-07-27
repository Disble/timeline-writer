import {
  App,
  TFile,
  Plugin,
  debounce,
  TAbstractFile,
  EventRef,
} from 'obsidian';
import { ContextDetectionEngine } from '../core/context-detection/ContextDetectionEngine';
import { ContextVersioningIntegration } from '../core/integration/ContextVersioningIntegration';
import { NavigationEngine } from '../core/timeline-engine/NavigationEngine';
import { VersionManager } from '../core/version-manager/VersionManager';
import { TimelineEngine } from '../core/timeline-engine/TimelineEngine';
import { StorageEngine } from '../data/storage/StorageEngine';
import { DatabaseManager } from '../data/storage/DatabaseManager';
import { Logger } from '../utils/logger';
import { FileOperation } from '../data/models/core';

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
  private eventRefs: EventRef[] = [];

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
    const dbManager = new DatabaseManager(this.logger);
    await dbManager.initialize();

    this.storageEngine = new StorageEngine(dbManager, this.logger);
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

  private async handleFileModify(file: TFile): Promise<void> {
    if (!this.shouldProcessFile(file)) {
      return;
    }

    // Use debounced handler to avoid processing too frequently
    const key = file.path;
    if (this.debouncedHandlers.has(key)) {
      return; // Already has pending handler
    }

    const debouncedHandler = debounce(
      async () => {
        await this.processFileOperation(file, 'modify');
        this.debouncedHandlers.delete(key);
      },
      this.config.debounceDelay,
      true
    );

    this.debouncedHandlers.set(key, debouncedHandler);
    debouncedHandler();
  }

  private async handleFileCreate(file: TFile): Promise<void> {
    if (!this.shouldProcessFile(file)) {
      return;
    }

    await this.processFileOperation(file, 'create');
  }

  private async handleFileDelete(file: TFile): Promise<void> {
    if (!this.shouldProcessFile(file)) {
      return;
    }

    await this.processFileOperation(file, 'delete');
  }

  private registerEvent(eventRef: EventRef): void {
    this.eventRefs.push(eventRef);
  }

  private async handleFileRename(
    file: TAbstractFile,
    oldPath: string
  ): Promise<void> {
    if (!(file instanceof TFile) || !this.shouldProcessFile(file)) {
      return;
    }

    // Handle rename as a special case
    this.logger.debug('File renamed', { oldPath, newPath: file.path });

    // Update internal tracking
    this.fileContentCache.delete(oldPath);
    this.debouncedHandlers.delete(oldPath);
  }

  private async handleFileOpen(file: TFile | null): Promise<void> {
    if (!file || !this.shouldProcessFile(file)) {
      return;
    }

    // Cache current content for later comparison
    try {
      const content = await this.app.vault.read(file);
      this.fileContentCache.set(file.path, content);
    } catch (error) {
      this.logger.debug('Failed to cache file content on open', error);
    }
  }

  private async handleWorkspaceQuit(): Promise<void> {
    await this.cleanup();
  }

  private async processFileOperation(
    file: TFile,
    operationType: 'create' | 'modify' | 'delete'
  ): Promise<void> {
    const filePath = file.path;

    // Prevent concurrent processing of same file
    if (this.processingQueue.has(filePath)) {
      this.logger.debug('File already being processed, skipping', { filePath });
      return;
    }

    this.processingQueue.add(filePath);

    try {
      let currentContent = '';
      let previousContent = '';

      if (operationType !== 'delete') {
        currentContent = await this.app.vault.read(file);
      }

      if (operationType === 'modify') {
        previousContent = this.fileContentCache.get(filePath) || '';
      }

      const operation: FileOperation = {
        type: operationType,
        filePath,
        content: currentContent,
        timestamp: new Date(),
      };

      // Only process for context detection if it's a modification with previous content
      if (
        operationType === 'modify' &&
        previousContent &&
        this.config.enableAutoDetection
      ) {
        await this.processContextDetection(file, operation, previousContent);
      }

      // Update cache
      if (operationType !== 'delete') {
        this.fileContentCache.set(filePath, currentContent);
      } else {
        this.fileContentCache.delete(filePath);
      }

      this.logger.debug('File operation processed', {
        filePath,
        operationType,
        contentLength: currentContent.length,
      });
    } catch (error) {
      this.logger.error('Failed to process file operation', error);
    } finally {
      this.processingQueue.delete(filePath);
    }
  }

  private async processContextDetection(
    file: TFile,
    operation: FileOperation,
    previousContent: string
  ): Promise<void> {
    try {
      // Run context detection
      const detection = await this.contextDetection.detectContextShift(
        file,
        operation.content,
        previousContent
      );

      if (detection) {
        this.logger.info('Context shift detected', {
          filePath: file.path,
          suggestedContext: detection.suggestedContext,
          confidence: detection.probability,
          signalsCount: detection.signals.length,
        });

        // Process through context versioning integration
        const result = await this.contextVersioning.handleContextShift(
          detection,
          file,
          operation.content
        );

        // Log results
        if (result.snapshotCreated) {
          this.logger.info('Automatic snapshot created', {
            filePath: file.path,
            snapshotId: result.snapshotId,
            contextId: detection.suggestedContext,
          });
        }

        // TODO: Show user notification if configured
        if (result.suggestions && result.suggestions.length > 0) {
          this.logger.debug('Integration suggestions', {
            suggestions: result.suggestions,
          });
        }
      }
    } catch (error) {
      this.logger.error('Context detection processing failed', error);
    }
  }

  private shouldProcessFile(file: TFile): boolean {
    // Check file size
    if (file.stat.size > this.config.maxFileSize) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(file.path, pattern)) {
        return false;
      }
    }

    // Only process markdown files for now
    return file.extension === 'md';
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Simple pattern matching - could be enhanced with proper glob support
    if (pattern.includes('**')) {
      const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      return new RegExp(regex).test(path);
    }
    return path.includes(pattern.replace(/\*/g, ''));
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
    try {
      // TODO: Implement background tasks like:
      // - Storage optimization
      // - Index rebuilding
      // - Performance monitoring
    } catch (error) {
      this.logger.debug('Background task failed', error);
    }
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
