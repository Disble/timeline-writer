import { randomUUID } from 'crypto';
import { FileMetadata, VersionSnapshot } from '../../data/models/core';
import { IStorageEngine } from '../../data/storage/IStorageEngine';
import { DiffEngine } from './DiffEngine';
import { CompressionEngine } from './CompressionEngine';

export interface IVersionManager {
  createVersionSnapshot(fileId: string, content: string): Promise<VersionSnapshot>;
  getVersionSnapshot(snapshotId: string): Promise<VersionSnapshot | null>;
  restoreVersion(snapshotId: string): Promise<string | null>;
}

export class VersionManager implements IVersionManager {
  private diffEngine: DiffEngine;
  private compressionEngine: CompressionEngine;

  constructor(private storage: IStorageEngine) {
    this.diffEngine = new DiffEngine();
    this.compressionEngine = new CompressionEngine();
  }

  async createVersionSnapshot(fileId: string, content: string): Promise<VersionSnapshot> {
    const history = await this.storage.getFileHistory(fileId);
    const parentNode = history?.currentVersion ? await this.storage.getNode(history.currentVersion) : null;
    
    let parentSnapshot: VersionSnapshot | null = null;
    if (parentNode) {
      const parentSnapshots = await this.storage.getSnapshots(parentNode.id);
      parentSnapshot =
        parentSnapshots.length > 0 ? parentSnapshots[0] || null : null;
    }

    const diff = parentSnapshot
      ? this.diffEngine.createDiff(parentSnapshot.fullContent || '', content)
      : null;

    const metadata: FileMetadata = {
      filePath: history?.fileName || 'unknown',
      timestamp: new Date(),
      contextId: parentNode?.contextId || 'default',
      isCheckpoint: parentNode?.isCheckpoint || false,
      compression: 'none',
      originalSize: content.length,
      compressedSize: content.length,
    };

    const newSnapshot: VersionSnapshot = {
      id: randomUUID(),
      fileId,
      nodeId: parentNode?.id || '',
      contentHash: randomUUID(), // Placeholder for content hash
      fullContent: content,
      size: content.length,
      metadata,
    };

    if (diff) {
      const diffString = JSON.stringify(diff);
      const compressedDiff = this.compressionEngine.compress(diffString);

      newSnapshot.diffFromParent = {
        algorithm: 'gzip',
        data: compressedDiff,
        originalSize: diffString.length,
        compressedSize: compressedDiff.length,
      };
    }

    await this.storage.saveSnapshot(newSnapshot);
    return newSnapshot;
  }

  async getVersionSnapshot(snapshotId: string): Promise<VersionSnapshot | null> {
    return this.storage.getSnapshot(snapshotId);
  }

  async restoreVersion(snapshotId: string): Promise<string | null> {
    const snapshot = await this.storage.getSnapshot(snapshotId);
    if (!snapshot) {
      return null;
    }

    if (snapshot.fullContent) {
      return snapshot.fullContent;
    }

    if (snapshot.diffFromParent) {
      const parentNode = await this.storage.getNode(snapshot.nodeId);
      let parentSnapshot: VersionSnapshot | null = null;
      if (parentNode) {
        const parentSnapshots = await this.storage.getSnapshots(parentNode.id);
        parentSnapshot =
          parentSnapshots.length > 0 ? parentSnapshots[0] || null : null;
      }

      if (parentSnapshot?.fullContent) {
        const decompressedDiffString = this.compressionEngine.decompress(
          snapshot.diffFromParent.data,
          snapshot.diffFromParent.algorithm,
        );
        const diff = JSON.parse(decompressedDiffString);
        return this.diffEngine.applyDiff(parentSnapshot.fullContent, diff);
      }
    }

    return null; // Cannot restore if no full content and no valid parent diff
  }
} 
