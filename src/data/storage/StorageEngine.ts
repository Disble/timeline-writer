import { TFile } from 'obsidian';
import * as pako from 'pako';
import DiffMatchPatch from 'diff-match-patch';
import { DatabaseManager } from './DatabaseManager';
import {
  VersionSnapshot,
  CompressedDiff,
  TimelineNode,
  TimelineBranch,
  FileVersionHistory,
  // FileMetadata, // TODO: Implement file metadata operations
} from '../models/core';
import { Logger } from '../../utils/logger';

export class StorageEngine {
  private dbManager: DatabaseManager;
  private logger: Logger;
  private dmp: DiffMatchPatch;
  private cache: Map<string, string> = new Map();

  constructor(dbManager: DatabaseManager, logger: Logger) {
    this.dbManager = dbManager;
    this.logger = logger;
    this.dmp = new DiffMatchPatch();
    this.dmp.Diff_Timeout = 1.0; // 1 second timeout for diff operations
  }

  async initialize(): Promise<void> {
    await this.dbManager.initialize();
    this.logger.info('Storage engine initialized');
  }

  async saveSnapshot(
    file: TFile,
    content: string,
    nodeId: string,
    contextId: string,
    isCheckpoint: boolean = false
  ): Promise<VersionSnapshot> {
    try {
      const contentHash = this.generateContentHash(content);
      const originalSize = content.length;

      // Get previous version for diff calculation
      const previousVersions = await this.dbManager.getFileVersionHistory(
        file.path
      );
      const previousContent =
        previousVersions.length > 0 && previousVersions[0]
          ? await this.getSnapshotContent(previousVersions[0])
          : null;

      let snapshot: VersionSnapshot;

      if (isCheckpoint || !previousContent) {
        // Store full content for checkpoints or first version
        snapshot = await this.createFullSnapshot(
          file,
          content,
          nodeId,
          contextId,
          contentHash,
          originalSize,
          isCheckpoint
        );
      } else {
        // Store compressed diff for regular snapshots
        snapshot = await this.createDiffSnapshot(
          file,
          content,
          previousContent,
          nodeId,
          contextId,
          contentHash,
          originalSize
        );
      }

      await this.dbManager.saveVersionSnapshot(snapshot);

      // Cache the content for future diff operations
      this.cache.set(snapshot.id, content);

      this.logger.debug('Snapshot saved', {
        snapshotId: snapshot.id,
        isCheckpoint,
        compressionRatio: snapshot.metadata.compressedSize / originalSize,
      });

      return snapshot;
    } catch (error) {
      this.logger.error('Failed to save snapshot', error);
      throw error;
    }
  }

  private async createFullSnapshot(
    file: TFile,
    content: string,
    nodeId: string,
    contextId: string,
    contentHash: string,
    originalSize: number,
    isCheckpoint: boolean
  ): Promise<VersionSnapshot> {
    const compressed = this.compressContent(content);

    return {
      id: this.generateSnapshotId(),
      fileId: file.path,
      nodeId,
      contentHash,
      size: compressed.length,
      fullContent: content,
      metadata: {
        filePath: file.path,
        timestamp: new Date(),
        contextId,
        isCheckpoint,
        compression: 'gzip',
        originalSize,
        compressedSize: compressed.length,
      },
    };
  }

  private async createDiffSnapshot(
    file: TFile,
    content: string,
    previousContent: string,
    nodeId: string,
    contextId: string,
    contentHash: string,
    originalSize: number
  ): Promise<VersionSnapshot> {
    // Create diff using diff-match-patch
    const diffs = this.dmp.diff_main(previousContent, content);
    this.dmp.diff_cleanupSemantic(diffs);

    const patches = this.dmp.patch_make(previousContent, diffs);
    const patchText = this.dmp.patch_toText(patches);

    // Compress the diff
    const compressedDiff = this.compressDiff(patchText);

    return {
      id: this.generateSnapshotId(),
      fileId: file.path,
      nodeId,
      contentHash,
      size: compressedDiff.compressedSize,
      diffFromParent: compressedDiff,
      metadata: {
        filePath: file.path,
        timestamp: new Date(),
        contextId,
        isCheckpoint: false,
        compression: 'gzip',
        originalSize,
        compressedSize: compressedDiff.compressedSize,
      },
    };
  }

  async getSnapshotContent(snapshot: VersionSnapshot): Promise<string> {
    try {
      // Check cache first
      const cached = this.cache.get(snapshot.id);
      if (cached) return cached;

      if (snapshot.fullContent) {
        // Full content snapshot
        this.cache.set(snapshot.id, snapshot.fullContent);
        return snapshot.fullContent;
      }

      if (snapshot.diffFromParent) {
        // Diff snapshot - need to reconstruct content
        const content = await this.reconstructContentFromDiff(snapshot);
        this.cache.set(snapshot.id, content);
        return content;
      }

      throw new Error('Snapshot has no content or diff data');
    } catch (error) {
      this.logger.error('Failed to get snapshot content', error);
      throw error;
    }
  }

  private async reconstructContentFromDiff(
    snapshot: VersionSnapshot
  ): Promise<string> {
    if (!snapshot.diffFromParent) {
      throw new Error('No diff data available');
    }

    // Get all versions for this file to find the base content
    const allVersions = await this.dbManager.getFileVersionHistory(
      snapshot.fileId
    );

    // Find the nearest checkpoint or full content version
    let baseContent = '';
    let currentSnapshot = snapshot;
    const diffChain: VersionSnapshot[] = [];

    // Build the chain of diffs back to a full content version
    while (currentSnapshot.diffFromParent && !currentSnapshot.fullContent) {
      diffChain.unshift(currentSnapshot);

      // Find the parent snapshot
      const parentSnapshot = allVersions.find(
        v =>
          new Date(v.metadata.timestamp) <
          new Date(currentSnapshot.metadata.timestamp)
      );

      if (!parentSnapshot) {
        throw new Error(
          'Could not find parent snapshot for diff reconstruction'
        );
      }

      currentSnapshot = parentSnapshot;
    }

    // Start with the base content
    baseContent = currentSnapshot.fullContent || '';

    // Apply diffs in order
    for (const diffSnapshot of diffChain) {
      if (diffSnapshot.diffFromParent) {
        const patchText = this.decompressDiff(diffSnapshot.diffFromParent);
        const patches = this.dmp.patch_fromText(patchText);
        const [newContent] = this.dmp.patch_apply(patches, baseContent);
        baseContent = newContent;
      }
    }

    return baseContent;
  }

  private compressContent(content: string): Uint8Array {
    try {
      const input = new TextEncoder().encode(content);
      return pako.gzip(input, { level: 6 });
    } catch (error) {
      this.logger.error('Failed to compress content', error);
      throw error;
    }
  }

  private compressDiff(diffText: string): CompressedDiff {
    try {
      const input = new TextEncoder().encode(diffText);
      const compressed = pako.gzip(input, { level: 9 }); // Higher compression for diffs

      return {
        algorithm: 'gzip',
        data: compressed,
        originalSize: input.length,
        compressedSize: compressed.length,
      };
    } catch (error) {
      this.logger.error('Failed to compress diff', error);
      throw error;
    }
  }

  private decompressDiff(compressedDiff: CompressedDiff): string {
    try {
      const decompressed = pako.ungzip(compressedDiff.data);
      return new TextDecoder().decode(decompressed);
    } catch (error) {
      this.logger.error('Failed to decompress diff', error);
      throw error;
    }
  }

  private generateContentHash(content: string): string {
    // Simple hash function - in production, consider using crypto.subtle.digest
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getStorageStats(): Promise<{
    totalSnapshots: number;
    totalSize: number;
    compressionRatio: number;
    filesTracked: number;
  }> {
    // This would require additional database queries
    // Implementation depends on specific statistics needed
    return {
      totalSnapshots: 0,
      totalSize: 0,
      compressionRatio: 0,
      filesTracked: 0,
    };
  }

  async cleanup(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Implementation for cleaning up old snapshots
    // This would involve database queries to remove old versions
    this.logger.info('Storage cleanup completed', { retentionDays });
  }

  // IStorageEngine interface methods
  async getNode(nodeId: string): Promise<TimelineNode | null> {
    return this.dbManager.getTimelineNode(nodeId);
  }

  async saveNode(node: TimelineNode): Promise<void> {
    await this.dbManager.saveTimelineNode(node);
  }

  async getNodes(_fileId: string): Promise<TimelineNode[]> {
    // This would need to be implemented in DatabaseManager
    // For now, return empty array
    return [];
  }

  async appendChildToNode(nodeId: string, childId: string): Promise<boolean> {
    return this.dbManager.appendChildToNode(nodeId, childId);
  }

  async getBranch(_branchId: string): Promise<TimelineBranch | null> {
    // This would need to be implemented in DatabaseManager
    return null;
  }

  async saveBranch(_branch: TimelineBranch): Promise<void> {
    // This would need to be implemented in DatabaseManager
  }

  async getBranches(_fileId: string): Promise<TimelineBranch[]> {
    // This would need to be implemented in DatabaseManager
    return [];
  }

  async getSnapshot(_snapshotId: string): Promise<VersionSnapshot | null> {
    // This would need to be implemented in DatabaseManager
    return null;
  }

  async saveSnapshotById(snapshot: VersionSnapshot): Promise<void> {
    await this.dbManager.saveVersionSnapshot(snapshot);
  }

  async getSnapshots(_nodeId: string): Promise<VersionSnapshot[]> {
    // This would need to be implemented in DatabaseManager
    return [];
  }

  async getFileHistory(_fileId: string): Promise<FileVersionHistory | null> {
    // This would need to be implemented in DatabaseManager
    return null;
  }

  async saveFileHistory(_history: FileVersionHistory): Promise<void> {
    // This would need to be implemented in DatabaseManager
  }

  async get(_key: string): Promise<string | null> {
    // This would need to be implemented in DatabaseManager
    return null;
  }

  async set(_key: string, _value: string): Promise<void> {
    // This would need to be implemented in DatabaseManager
  }

  async close(): Promise<void> {
    await this.dbManager.close();
    this.cache.clear();
    this.logger.info('Storage engine closed');
  }
}
