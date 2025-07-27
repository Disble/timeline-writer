// Core data models for Timeline Writer
export interface TimelineNode {
  id: string;
  timestamp: Date;
  parentIds: string[];
  childIds: string[];
  contextId: string;
  label: string;
  description?: string;
  isCheckpoint: boolean;
  metadata: NodeMetadata;
}

export interface NodeMetadata {
  fileId: string;
  filePath: string;
  wordCount: number;
  characterCount: number;
  contentHash: string;
  createdBy: 'user' | 'auto';
  contextSignals?: ContextSignal[];
}

export interface VersionSnapshot {
  id: string;
  fileId: string;
  nodeId: string;
  contentHash: string;
  diffFromParent?: CompressedDiff;
  fullContent?: string;
  size: number;
  metadata: FileMetadata;
}

export interface FileMetadata {
  filePath: string;
  timestamp: Date;
  contextId: string;
  isCheckpoint: boolean;
  compression: 'none' | 'gzip' | 'lz4';
  originalSize: number;
  compressedSize: number;
}

export interface ContextDefinition {
  id: string;
  name: string;
  description?: string;
  color: string;
  keywords: string[];
  parentContext?: string;
  isActive: boolean;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface FileVersionHistory {
  fileId: string;
  fileName: string;
  currentVersion: string;
  versions: VersionSnapshot[];
  branches: TimelineBranch[];
  lastModified: Date;
  metadata: FileMetadata;
}

export interface TimelineBranch {
  id: string;
  name: string;
  parentNodeId: string;
  nodes: string[]; // Array of node IDs
  isActive: boolean;
  createdAt: Date;
  lastModified: Date;
}

// Analysis and Detection Models
export interface ContextSignal {
  type: 'semantic' | 'temporal' | 'behavioral' | 'keyword';
  confidence: number; // 0-1
  evidence: any;
  weight: number;
}

export interface ContextShiftDetection {
  probability: number;
  suggestedContext: string;
  signals: ContextSignal[];
  timestamp: Date;
  fileOperation: FileOperation;
}

export interface SemanticAnalysis {
  tfidfVector: number[];
  keywords: Array<{ word: string; score: number }>;
  similarity: number;
  topicDistribution: Record<string, number>;
}

export interface FileOperation {
  type: 'create' | 'modify' | 'delete';
  filePath: string;
  content: string;
  timestamp: Date;
  userId?: string;
}

// Compression and Diff types
export interface CompressedDiff {
  algorithm: 'gzip' | 'lz4';
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
}

export interface DiffResult {
  additions: number;
  deletions: number;
  modifications: number;
  chunks: DiffChunk[];
}

export interface DiffChunk {
  type: 'add' | 'delete' | 'modify' | 'unchanged';
  content: string;
  lineStart: number;
  lineEnd: number;
}

// Utility types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface Logger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
  critical(message: string, context?: any): void;
}