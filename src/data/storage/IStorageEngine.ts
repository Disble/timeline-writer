import { FileVersionHistory, TimelineBranch, TimelineNode, VersionSnapshot } from '../models/core';

export interface IStorageEngine {
  // Timeline Node operations
  getNode(nodeId: string): Promise<TimelineNode | null>;
  saveNode(node: TimelineNode): Promise<void>;
  getNodes(fileId: string): Promise<TimelineNode[]>;

  // Branch operations
  getBranch(branchId: string): Promise<TimelineBranch | null>;
  saveBranch(branch: TimelineBranch): Promise<void>;
  getBranches(fileId: string): Promise<TimelineBranch[]>;

  // Version Snapshot operations
  getSnapshot(snapshotId: string): Promise<VersionSnapshot | null>;
  saveSnapshot(snapshot: VersionSnapshot): Promise<void>;
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
} 
