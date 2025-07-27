import type {
  FileVersionHistory,
  TimelineBranch,
  TimelineNode,
  VersionSnapshot,
} from '../models/core';

export interface IStorageEngine {
  // Timeline Node operations
  getNode(nodeId: string): Promise<TimelineNode | null>;
  saveNode(node: TimelineNode): Promise<void>;
  getNodes(fileId: string): Promise<TimelineNode[]>;
  appendChildToNode(nodeId: string, childId: string): Promise<boolean>;

  // Branch operations
  getBranch(branchId: string): Promise<TimelineBranch | null>;
  saveBranch(branch: TimelineBranch): Promise<void>;
  getBranches(fileId: string): Promise<TimelineBranch[]>;

  // Version Snapshot operations
  getSnapshot(snapshotId: string): Promise<VersionSnapshot | null>;
  saveSnapshot(
    file: { path: string },
    content: string,
    nodeId: string,
    contextId: string,
    isCheckpoint?: boolean
  ): Promise<VersionSnapshot>;
  saveSnapshotObject(snapshot: VersionSnapshot): Promise<void>;
  getSnapshots(nodeId: string): Promise<VersionSnapshot[]>;

  // File History operations
  getFileHistory(fileId: string): Promise<FileVersionHistory | null>;
  saveFileHistory(history: FileVersionHistory): Promise<void>;

  // Key-Value storage for metadata like DB version
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;

  // Utility
  initialize(): Promise<void>;
  close(): Promise<void>;
  renameFilePath(oldPath: string, newPath: string): Promise<void>;
  getSnapshotsCount(): Promise<number>;
  getNodesCount(): Promise<number>;
}
