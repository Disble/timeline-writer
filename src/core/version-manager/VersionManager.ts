import { v4 as uuidv4 } from 'uuid';
import type { VersionSnapshot } from '../../data/models/core';
import type { IStorageEngine } from '../../data/storage/IStorageEngine';
import type { Logger } from '../../utils/logger';
import type { CompressionEngine } from './CompressionEngine';
import type { DiffEngine } from './DiffEngine';

export class VersionManager {
  public storageEngine: IStorageEngine;
  private diffEngine: DiffEngine;
  private compressionEngine: CompressionEngine;

  constructor(
    storageEngine: IStorageEngine,
    diffEngine: DiffEngine,
    compressionEngine: CompressionEngine,
    _logger: Logger
  ) {
    this.storageEngine = storageEngine;
    this.diffEngine = diffEngine;
    this.compressionEngine = compressionEngine;
  }

  async createVersionSnapshot(
    filePath: string,
    content: string,
    isCheckpoint: boolean
  ): Promise<VersionSnapshot> {
    const history = await this.storageEngine.getFileHistory(filePath);
    const parentNode = history?.currentVersion
      ? await this.storageEngine.getNode(history.currentVersion)
      : null;

    let parentSnapshot: VersionSnapshot | null = null;
    if (parentNode) {
      const parentSnapshots = await this.storageEngine.getSnapshots(
        parentNode.id
      );
      parentSnapshot =
        parentSnapshots.length > 0 ? parentSnapshots[0] || null : null;
    }

    const newSnapshot: VersionSnapshot = {
      id: uuidv4(),
      fileId: history?.fileId ?? filePath,
      nodeId: '', // This will be set when the timeline node is created
      contentHash: '', // This will be calculated
      size: content.length,
      metadata: {
        filePath: filePath,
        timestamp: new Date(),
        contextId: parentNode?.contextId ?? 'default',
        isCheckpoint,
        compression: 'gzip',
        originalSize: content.length,
        compressedSize: 0,
      },
    };

    if (parentSnapshot?.fullContent) {
      const patch = this.diffEngine.createPatch(
        parentSnapshot.fullContent,
        content
      );
      const compressedPatch = this.compressionEngine.compress(patch);
      newSnapshot.diffFromParent = {
        algorithm: 'gzip',
        data: compressedPatch,
        originalSize: patch.length,
        compressedSize: compressedPatch.length,
      };
      newSnapshot.metadata.compressedSize = compressedPatch.length;
    } else {
      newSnapshot.fullContent = content;
    }

    await this.storageEngine.saveSnapshotObject(newSnapshot);
    return newSnapshot;
  }
}
