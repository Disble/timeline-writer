import type { TimelineNode } from '../../data/models/core';
import type { Logger } from '../../utils/logger';
import type { ContextDetectionEngine } from '../context-detection/ContextDetectionEngine';
import type { TimelineEngine } from '../timeline-engine/TimelineEngine';
import type { VersionManager } from '../version-manager/VersionManager';

export class ContextVersioningIntegration {
  constructor(
    private versionManager: VersionManager,
    private timelineEngine: TimelineEngine,
    private contextDetection: ContextDetectionEngine,
    private logger: Logger
  ) {}

  async processFileChange(
    filePath: string,
    newContent: string,
    oldContent: string
  ): Promise<void> {
    const contextShift = await this.contextDetection.analyze(
      newContent,
      oldContent
    );

    if (contextShift.probability > 0.5) {
      this.logger.info('Context shift detected, creating checkpoint.', {
        filePath,
        probability: contextShift.probability,
      });
      await this.versionManager.createVersionSnapshot(
        filePath,
        newContent,
        true
      );
    } else {
      this.logger.debug('No significant context shift detected.', { filePath });
    }
  }

  async createManualCheckpoint(
    filePath: string,
    content: string,
    label: string
  ): Promise<TimelineNode> {
    const snapshot = await this.versionManager.createVersionSnapshot(
      filePath,
      content,
      true
    );
    const node = await this.timelineEngine.getNode(snapshot.nodeId);
    if (!node) {
      throw new Error('Failed to create timeline node for manual checkpoint.');
    }
    // Update label for manual checkpoint
    node.label = label;
    await this.timelineEngine.saveNode(node);
    return node;
  }

  async handleFileDeletion(filePath: string): Promise<void> {
    this.logger.info(`Handling deletion of file: ${filePath}`);
    // Future implementation could involve archiving or marking nodes as deleted
  }

  async handleFileRename(oldPath: string, newPath: string): Promise<void> {
    this.logger.info(`Handling rename from ${oldPath} to ${newPath}`);
    await this.storageEngine.renameFilePath(oldPath, newPath);
  }

  async getStatistics(): Promise<{
    totalSnapshots: number;
    totalNodes: number;
  }> {
    return {
      totalSnapshots: await this.storageEngine.getSnapshotsCount(),
      totalNodes: await this.storageEngine.getNodesCount(),
    };
  }

  private get storageEngine() {
    return this.versionManager.storageEngine;
  }
}
