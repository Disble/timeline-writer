import type { TimelineNode, VersionSnapshot } from '../../data/models/core';
import type { IStorageEngine } from '../../data/storage/IStorageEngine';
import type { Logger } from '../../utils/logger';

export interface NavigationResult {
  success: boolean;
  message: string;
  previousNode?: TimelineNode | null;
  content?: string | null;
}

export class NavigationEngine {
  private storage: IStorageEngine;
  private currentPosition: Map<string, string> = new Map(); // fileId -> nodeId

  constructor(storage: IStorageEngine, _logger: Logger) {
    this.storage = storage;
  }

  async navigateToNode(
    filePath: string,
    targetNodeId: string
  ): Promise<NavigationResult> {
    const fileId = await this.getFileId(filePath);
    const targetNode = await this.storage.getNode(targetNodeId);
    if (!targetNode) {
      return { success: false, message: `Node ${targetNodeId} not found` };
    }

    const previousNodeId = this.currentPosition.get(fileId);
    const previousNode = previousNodeId
      ? await this.storage.getNode(previousNodeId)
      : null;

    this.currentPosition.set(fileId, targetNodeId);
    return {
      success: true,
      message: 'Navigation successful',
      previousNode,
      content: await this.getNodeContent(targetNode),
    };
  }

  private async getNodeContent(node: TimelineNode): Promise<string | null> {
    const snapshots = await this.storage.getSnapshots(node.id);
    if (snapshots.length === 0) return null;
    const snapshot = snapshots[0] as VersionSnapshot;
    return snapshot.fullContent ?? null; // Simplified content retrieval
  }

  getCurrentPosition(filePath: string): string | undefined {
    return this.currentPosition.get(filePath);
  }

  async getTimelineStatistics(filePath: string): Promise<object> {
    const fileId = await this.getFileId(filePath);
    const nodes = await this.storage.getNodes(fileId);
    return {
      totalNodes: nodes.length,
    };
  }

  private async getFileId(filePath: string): Promise<string> {
    const history = await this.storage.getFileHistory(filePath);
    return history?.fileId ?? filePath;
  }
}
