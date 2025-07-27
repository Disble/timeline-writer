import { randomUUID } from 'crypto';
import {
  FileVersionHistory,
  NodeMetadata,
  TimelineBranch,
  TimelineNode,
} from '../../data/models/core';
import { IStorageEngine } from '../../data/storage/IStorageEngine';

export interface ITimelineEngine {
  createNode(
    fileId: string,
    label: string,
    isCheckpoint: boolean
  ): Promise<TimelineNode>;
  createBranch(
    fileId: string,
    name: string,
    parentNodeId: string
  ): Promise<TimelineBranch>;
  getTimeline(fileId: string): Promise<FileVersionHistory | null>;
  getNode(nodeId: string): Promise<TimelineNode | null>;
  getBranch(branchId: string): Promise<TimelineBranch | null>;
  switchBranch(fileId: string, branchId: string): Promise<boolean>;
}

export class TimelineEngine implements ITimelineEngine {
  constructor(private storage: IStorageEngine) {}

  async createNode(
    fileId: string,
    label: string,
    isCheckpoint: boolean
  ): Promise<TimelineNode> {
    const history = await this.storage.getFileHistory(fileId);
    const parentNode = history?.currentVersion
      ? await this.storage.getNode(history.currentVersion)
      : null;

    const dummyMetadata: NodeMetadata = {
      fileId,
      filePath: history?.fileName || 'unknown',
      wordCount: 0,
      characterCount: 0,
      contentHash: randomUUID(), // Placeholder for content hash
      createdBy: 'auto',
    };

    const newNode: TimelineNode = {
      id: randomUUID(),
      timestamp: new Date(),
      parentIds: parentNode ? [parentNode.id] : [],
      childIds: [],
      contextId: parentNode?.contextId || 'default',
      label,
      isCheckpoint,
      metadata: dummyMetadata,
    };

    await this.storage.saveNode(newNode);

    if (parentNode) {
      await this.storage.appendChildToNode(parentNode.id, newNode.id);
    }

    const newHistory: FileVersionHistory = history || {
      fileId,
      fileName: 'unknown',
      currentVersion: '',
      versions: [],
      branches: [],
      lastModified: new Date(),
      metadata: {
        filePath: 'unknown',
        timestamp: new Date(),
        contextId: 'default',
        isCheckpoint: false,
        compression: 'none',
        originalSize: 0,
        compressedSize: 0,
      },
    };

    newHistory.currentVersion = newNode.id;
    newHistory.lastModified = new Date();

    await this.storage.saveFileHistory(newHistory);

    return newNode;
  }

  async createBranch(
    fileId: string,
    name: string,
    parentNodeId: string
  ): Promise<TimelineBranch> {
    const parentNode = await this.storage.getNode(parentNodeId);
    if (!parentNode) {
      throw new Error(`Parent node with id ${parentNodeId} not found`);
    }

    const history = await this.storage.getFileHistory(fileId);
    if (!history) {
      throw new Error(`File history for fileId ${fileId} not found`);
    }

    const newBranch: TimelineBranch = {
      id: randomUUID(),
      name,
      parentNodeId,
      nodes: [parentNodeId],
      isActive: false,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    history.branches.push(newBranch);
    await this.storage.saveFileHistory(history);
    await this.storage.saveBranch(newBranch);

    return newBranch;
  }

  async getTimeline(fileId: string): Promise<FileVersionHistory | null> {
    return this.storage.getFileHistory(fileId);
  }

  async getNode(nodeId: string): Promise<TimelineNode | null> {
    return this.storage.getNode(nodeId);
  }

  async getBranch(branchId: string): Promise<TimelineBranch | null> {
    return this.storage.getBranch(branchId);
  }

  async switchBranch(fileId: string, branchId: string): Promise<boolean> {
    const history = await this.storage.getFileHistory(fileId);
    if (!history) {
      throw new Error(`File history for fileId ${fileId} not found`);
    }

    const newActiveBranch = history.branches.find(b => b.id === branchId);
    if (!newActiveBranch || newActiveBranch.nodes.length === 0) {
      return false; // Branch not found or is empty
    }

    // Deactivate all other branches for the file
    for (const branch of history.branches) {
      if (branch.id !== branchId && branch.isActive) {
        branch.isActive = false;
        await this.storage.saveBranch(branch);
      }
    }

    newActiveBranch.isActive = true;
    const lastNodeId = newActiveBranch.nodes[newActiveBranch.nodes.length - 1];
    if (lastNodeId) {
      history.currentVersion = lastNodeId;
    }
    history.lastModified = new Date();

    await this.storage.saveBranch(newActiveBranch);
    await this.storage.saveFileHistory(history);

    return true;
  }
}
