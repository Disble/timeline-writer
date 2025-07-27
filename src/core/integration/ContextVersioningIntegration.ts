import type { TFile } from 'obsidian';
import type {
  ContextDefinition,
  ContextShiftDetection,
  TimelineNode,
  VersionSnapshot,
} from '../../data/models/core';
import type { Logger } from '../../utils/logger';
import type { TimelineEngine } from '../timeline-engine/TimelineEngine';
import type { VersionManager } from '../version-manager/VersionManager';

export interface SnapshotTrigger {
  type: 'context-shift' | 'manual' | 'periodic' | 'significant-change';
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface IntegrationResult {
  snapshotCreated: boolean;
  snapshotId?: string;
  timelineUpdated: boolean;
  nodeId?: string;
  userNotified: boolean;
  suggestions?: string[];
}

export interface IntegrationConfig {
  autoSnapshotEnabled: boolean;
  minimumConfidenceThreshold: number;
  significantChangeThreshold: number;
  maxSnapshotsPerHour: number;
  userConfirmationRequired: boolean;
  enableLearning: boolean;
}

const DEFAULT_CONFIG: IntegrationConfig = {
  autoSnapshotEnabled: true,
  minimumConfidenceThreshold: 0.7,
  significantChangeThreshold: 0.5,
  maxSnapshotsPerHour: 10,
  userConfirmationRequired: false,
  enableLearning: true,
};

export class ContextVersioningIntegration {
  private versionManager: VersionManager;
  private timelineEngine: TimelineEngine;
  private logger: Logger;
  private config: IntegrationConfig;
  private recentSnapshots: Map<string, Date[]> = new Map();
  private userFeedback: Map<string, { correct: boolean; timestamp: Date }> =
    new Map();

  constructor(
    versionManager: VersionManager,
    timelineEngine: TimelineEngine,
    logger: Logger,
    config: Partial<IntegrationConfig> = {}
  ) {
    this.versionManager = versionManager;
    this.timelineEngine = timelineEngine;
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async handleContextShift(
    detection: ContextShiftDetection,
    currentFile: TFile,
    currentContent: string
  ): Promise<IntegrationResult> {
    const startTime = performance.now();

    try {
      const result: IntegrationResult = {
        snapshotCreated: false,
        timelineUpdated: false,
        userNotified: false,
        suggestions: [],
      };

      // 1. Evaluate if snapshot should be created
      const shouldSnapshot = await this.evaluateSnapshotNeed(
        detection,
        currentFile
      );

      if (shouldSnapshot) {
        // 2. Create snapshot
        const trigger: SnapshotTrigger = {
          type: 'context-shift',
          confidence: detection.probability,
          metadata: {
            suggestedContext: detection.suggestedContext,
            signalsCount: detection.signals.length,
            timestamp: detection.timestamp,
          },
        };

        const snapshot = await this.createSnapshotSafely(
          currentFile,
          currentContent,
          detection.suggestedContext,
          trigger
        );

        if (snapshot) {
          result.snapshotCreated = true;
          result.snapshotId = snapshot.id;

          // Track recent snapshots for rate limiting
          this.trackSnapshot(currentFile.path);
        }
      }

      // 3. Update timeline regardless of snapshot creation
      const timelineResult = await this.updateTimeline(detection, currentFile);
      if (timelineResult) {
        result.timelineUpdated = true;
        result.nodeId = timelineResult.id;
      }

      // 4. Generate suggestions
      result.suggestions = this.generateSuggestions(detection, result);

      // 5. Notify user if configured
      if (this.config.userConfirmationRequired && result.snapshotCreated) {
        result.userNotified = await this.notifyUser(detection, result);
      }

      const processingTime = performance.now() - startTime;
      this.logger.debug('Context versioning integration completed', {
        filePath: currentFile.path,
        processingTime: `${processingTime.toFixed(2)}ms`,
        snapshotCreated: result.snapshotCreated,
        timelineUpdated: result.timelineUpdated,
      });

      return result;
    } catch (error) {
      this.logger.error('Context versioning integration failed', error);
      throw error;
    }
  }

  private async evaluateSnapshotNeed(
    detection: ContextShiftDetection,
    file: TFile
  ): Promise<boolean> {
    // Check if auto-snapshot is enabled
    if (!this.config.autoSnapshotEnabled) {
      return false;
    }

    // Check confidence threshold
    if (detection.probability < this.config.minimumConfidenceThreshold) {
      return false;
    }

    // Check rate limiting
    if (this.isRateLimited(file.path)) {
      this.logger.debug('Snapshot creation rate limited', {
        filePath: file.path,
        recentSnapshots: this.recentSnapshots.get(file.path)?.length || 0,
      });
      return false;
    }

    // Check for significant content changes
    const hasSignificantChanges = await this.hasSignificantChanges(detection);
    if (!hasSignificantChanges) {
      return false;
    }

    // Apply learning if enabled
    if (this.config.enableLearning) {
      const learningScore = this.calculateLearningScore(detection);
      if (learningScore < 0.5) {
        return false;
      }
    }

    return true;
  }

  private async createSnapshotSafely(
    file: TFile,
    content: string,
    contextId: string,
    trigger: SnapshotTrigger
  ): Promise<VersionSnapshot | null> {
    try {
      // Get or create context definition
      await this.getContextDefinition(contextId);

      const snapshot = await this.versionManager.createVersionSnapshot(
        file.path,
        content
      );

      // Enhance snapshot metadata with trigger information
      if (snapshot.metadata) {
        snapshot.metadata.trigger = trigger;
        snapshot.metadata.contextId = contextId;
      }

      this.logger.info('Automatic snapshot created', {
        snapshotId: snapshot.id,
        filePath: file.path,
        contextId,
        trigger: trigger.type,
        confidence: trigger.confidence,
      });

      return snapshot;
    } catch (error) {
      this.logger.error('Failed to create automatic snapshot', error);
      return null;
    }
  }

  private async updateTimeline(
    detection: ContextShiftDetection,
    file: TFile
  ): Promise<TimelineNode | null> {
    try {
      // Create or update timeline node
      const node = await this.timelineEngine.createNode(
        file.path,
        `Context: ${detection.suggestedContext}`,
        false // Not a manual checkpoint
      );

      // Update node metadata with detection information
      if (node.metadata) {
        node.metadata.contextShift = {
          probability: detection.probability,
          suggestedContext: detection.suggestedContext,
          signalTypes: detection.signals.map(s => s.type),
          timestamp: detection.timestamp,
        };
      }

      return node;
    } catch (error) {
      this.logger.error('Failed to update timeline', error);
      return null;
    }
  }

  private isRateLimited(filePath: string): boolean {
    const recent = this.recentSnapshots.get(filePath) || [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentCount = recent.filter(date => date > oneHourAgo).length;
    return recentCount >= this.config.maxSnapshotsPerHour;
  }

  private async hasSignificantChanges(
    detection: ContextShiftDetection
  ): Promise<boolean> {
    // For now, use detection confidence as proxy for significance
    // TODO: Implement content-based significance analysis
    return detection.probability >= this.config.significantChangeThreshold;
  }

  private calculateLearningScore(_detection: ContextShiftDetection): number {
    // Simple learning based on past user feedback
    const contextFeedback = Array.from(this.userFeedback.values())
      .filter(f => f.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last week
      .map(f => (f.correct ? 1 : 0));

    if (contextFeedback.length === 0) {
      return 1.0; // No data, assume positive
    }

    const successRate =
      contextFeedback.reduce((sum: number, score) => sum + score, 0) /
      contextFeedback.length;
    return Math.max(0.1, successRate); // Minimum 0.1 to allow recovery
  }

  private generateSuggestions(
    detection: ContextShiftDetection,
    result: IntegrationResult
  ): string[] {
    const suggestions: string[] = [];

    if (result.snapshotCreated) {
      suggestions.push(
        `Snapshot created for context: ${detection.suggestedContext}`
      );
    }

    if (detection.probability < 0.9) {
      suggestions.push('Consider manually confirming the context change');
    }

    if (detection.signals.length === 1) {
      suggestions.push(
        'Context change detected with single signal - verify accuracy'
      );
    }

    return suggestions;
  }

  private async notifyUser(
    detection: ContextShiftDetection,
    result: IntegrationResult
  ): Promise<boolean> {
    // TODO: Implement user notification system
    // This would integrate with Obsidian's notification system
    this.logger.info('User notification would be shown', {
      contextChange: detection.suggestedContext,
      snapshotCreated: result.snapshotCreated,
    });
    return true;
  }

  private trackSnapshot(filePath: string): void {
    const recent = this.recentSnapshots.get(filePath) || [];
    recent.push(new Date());

    // Keep only last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filtered = recent.filter(date => date > oneDayAgo);

    this.recentSnapshots.set(filePath, filtered);
  }

  private async getContextDefinition(
    contextId: string
  ): Promise<ContextDefinition> {
    // TODO: Implement context definition lookup from storage
    // For now, return a default context
    return {
      id: contextId,
      name: contextId,
      keywords: [],
      color: '#999999',
      isActive: true,
      createdAt: new Date(),
      metadata: {},
    };
  }

  async recordUserFeedback(
    detectionId: string,
    correct: boolean,
    correctedContext?: string
  ): Promise<void> {
    this.userFeedback.set(detectionId, {
      correct,
      timestamp: new Date(),
    });

    if (!correct && correctedContext) {
      // TODO: Implement learning from corrections
      this.logger.info('User correction recorded', {
        detectionId,
        correctedContext,
      });
    }

    // Cleanup old feedback (keep only last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    for (const [key, feedback] of this.userFeedback.entries()) {
      if (feedback.timestamp < thirtyDaysAgo) {
        this.userFeedback.delete(key);
      }
    }
  }

  updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Integration config updated', { config: this.config });
  }

  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  async getStatistics(): Promise<{
    totalSnapshots: number;
    snapshotsPerFile: Record<string, number>;
    averageConfidence: number;
    userCorrections: number;
    successRate: number;
  }> {
    const totalSnapshots = Array.from(this.recentSnapshots.values()).reduce(
      (sum, snapshots) => sum + snapshots.length,
      0
    );

    const snapshotsPerFile = Object.fromEntries(
      Array.from(this.recentSnapshots.entries()).map(([file, snapshots]) => [
        file,
        snapshots.length,
      ])
    );

    const recentFeedback = Array.from(this.userFeedback.values()).filter(
      f => f.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const successRate =
      recentFeedback.length > 0
        ? recentFeedback.filter(f => f.correct).length / recentFeedback.length
        : 1.0;

    return {
      totalSnapshots,
      snapshotsPerFile,
      averageConfidence: 0.8, // TODO: Calculate from actual data
      userCorrections: recentFeedback.filter(f => !f.correct).length,
      successRate,
    };
  }
}
