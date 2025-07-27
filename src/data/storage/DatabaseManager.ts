import type { App } from 'obsidian';
import initSqlJs, { type Database } from 'sql.js';
import { Logger } from '../../utils/logger';
import type {
  ContextDefinition,
  TimelineNode,
  VersionSnapshot,
  // FileVersionHistory, // TODO: Implement file version history queries
} from '../models/core';

interface SQLiteRow {
  [key: string]: string | number | null;
}

interface TimelineNodeRow extends SQLiteRow {
  id: string;
  timestamp: string;
  parent_ids: string;
  child_ids: string;
  context_id: string;
  label: string;
  description: string;
  is_checkpoint: number;
  file_id: string;
  file_path: string;
  word_count: number;
  character_count: number;
  content_hash: string;
  created_by: string;
}

interface VersionSnapshotRow {
  [key: string]: string | number | null | Uint8Array;
  id: string;
  file_id: string;
  node_id: string;
  content_hash: string;
  size: number;
  full_content: string | null;
  diff_data?: Uint8Array | null;
  file_path: string;
  timestamp: string;
  context_id: string;
  is_checkpoint: number;
  compression: string;
  original_size: number;
  compressed_size: number;
}

interface ContextDefinitionRow extends SQLiteRow {
  id: string;
  name: string;
  description: string;
  color: string;
  keywords: string;
  parent_context: string | null;
  is_active: number;
  created_at: string;
  metadata: string;
}

const SQL_WASM_FILE = 'sql-wasm.wasm';

export class DatabaseManager {
  private static instance: DatabaseManager;
  db: Database | null = null;
  private logger = Logger.getInstance();
  private app: App;
  private pluginPath: string;

  private constructor(app: App, pluginPath: string) {
    this.app = app;
    this.pluginPath = pluginPath;
  }

  public static getInstance(app?: App, pluginPath?: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      if (!app || !pluginPath) {
        throw new Error(
          'DatabaseManager requires app and pluginPath for initialization'
        );
      }
      DatabaseManager.instance = new DatabaseManager(app, pluginPath);
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.db) {
      this.logger.warn('Database already initialized.');
      return;
    }

    try {
      this.logger.info('Initializing database...');
      const wasmPath = `${this.pluginPath}/${SQL_WASM_FILE}`;
      this.logger.info(`Loading wasm from: ${wasmPath}`);

      const response = await this.app.vault.adapter.readBinary(wasmPath);
      const SQL = await initSqlJs({ wasmBinary: response });
      this.db = new SQL.Database();

      // Enable foreign keys
      this.db.exec('PRAGMA foreign_keys = ON;');
      await this.createTables();

      this.logger.info('Database initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tableQueries = [
      // Timeline nodes table
      `CREATE TABLE IF NOT EXISTS timeline_nodes (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        parent_ids TEXT NOT NULL,
        child_ids TEXT NOT NULL,
        context_id TEXT NOT NULL,
        label TEXT NOT NULL,
        description TEXT,
        is_checkpoint INTEGER NOT NULL,
        file_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        word_count INTEGER NOT NULL,
        character_count INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,

      // Version snapshots table
      `CREATE TABLE IF NOT EXISTS version_snapshots (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        size INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        context_id TEXT NOT NULL,
        is_checkpoint INTEGER NOT NULL,
        compression TEXT NOT NULL,
        original_size INTEGER NOT NULL,
        compressed_size INTEGER NOT NULL,
        diff_data BLOB,
        full_content TEXT
      )`,

      // Context definitions table
      `CREATE TABLE IF NOT EXISTS context_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL,
        keywords TEXT NOT NULL,
        parent_context TEXT,
        is_active INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT NOT NULL
      )`,

      // File version history table
      `CREATE TABLE IF NOT EXISTS file_version_history (
        file_id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        current_version TEXT NOT NULL,
        last_modified INTEGER NOT NULL,
        metadata TEXT NOT NULL
      )`,

      // Timeline branches table
      `CREATE TABLE IF NOT EXISTS timeline_branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_node_id TEXT NOT NULL,
        nodes TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        last_modified INTEGER NOT NULL
      )`,

      // Context signals table
      `CREATE TABLE IF NOT EXISTS context_signals (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        type TEXT NOT NULL,
        confidence REAL NOT NULL,
        evidence TEXT NOT NULL,
        weight REAL NOT NULL,
        timestamp INTEGER NOT NULL
      )`,
    ];

    for (const query of tableQueries) {
      this.db.run(query);
    }

    // Create indexes for better performance
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_nodes_timestamp ON timeline_nodes(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_nodes_context ON timeline_nodes(context_id)',
      'CREATE INDEX IF NOT EXISTS idx_nodes_file ON timeline_nodes(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_snapshots_node ON version_snapshots(node_id)',
      'CREATE INDEX IF NOT EXISTS idx_snapshots_file ON version_snapshots(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_signals_node ON context_signals(node_id)',
    ];

    for (const query of indexQueries) {
      this.db.run(query);
    }
  }

  async saveTimelineNode(node: TimelineNode): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO timeline_nodes 
        (id, timestamp, parent_ids, child_ids, context_id, label, description, 
         is_checkpoint, file_id, file_path, word_count, character_count, 
         content_hash, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        node.id,
        node.timestamp.getTime(),
        JSON.stringify(node.parentIds),
        JSON.stringify(node.childIds),
        node.contextId,
        node.label,
        node.description || null,
        node.isCheckpoint ? 1 : 0,
        node.metadata.fileId,
        node.metadata.filePath,
        node.metadata.wordCount,
        node.metadata.characterCount,
        node.metadata.contentHash,
        node.metadata.createdBy,
        Date.now(),
      ]);

      stmt.free();
      this.logger.debug('Timeline node saved', { nodeId: node.id });
    } catch (error) {
      this.logger.error('Failed to save timeline node', error);
      throw error;
    }
  }

  async getTimelineNode(id: string): Promise<TimelineNode | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT * FROM timeline_nodes WHERE id = ?');
      const result = stmt.get([id]);
      stmt.free();

      if (!result) return null;

      return this.mapRowToTimelineNode(result as unknown as TimelineNodeRow);
    } catch (error) {
      this.logger.error('Failed to get timeline node', error);
      throw error;
    }
  }

  async appendChildToNode(nodeId: string, childId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Use a transaction to ensure atomicity
      this.db.exec('BEGIN TRANSACTION');

      // Get current child_ids
      const stmt = this.db.prepare(
        'SELECT child_ids FROM timeline_nodes WHERE id = ?'
      );
      const result = stmt.get([nodeId]);
      stmt.free();

      if (!result) {
        this.db.exec('ROLLBACK');
        return false;
      }

      const currentChildIds = result[0]
        ? (JSON.parse(result[0] as string) as string[])
        : [];

      // Check if childId already exists to avoid duplicates
      if (currentChildIds.includes(childId)) {
        this.db.exec('ROLLBACK');
        return true; // Already exists, consider it successful
      }

      // Append the new childId
      const updatedChildIds = [...currentChildIds, childId];

      // Update the node with new child_ids
      const updateStmt = this.db.prepare(
        'UPDATE timeline_nodes SET child_ids = ? WHERE id = ?'
      );
      updateStmt.run([JSON.stringify(updatedChildIds), nodeId]);
      updateStmt.free();

      this.db.exec('COMMIT');
      this.logger.debug('Child appended to node', { nodeId, childId });
      return true;
    } catch (error) {
      if (this.db) {
        this.db.exec('ROLLBACK');
      }
      this.logger.error('Failed to append child to node', error);
      throw error;
    }
  }

  async saveVersionSnapshot(snapshot: VersionSnapshot): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO version_snapshots 
        (id, file_id, node_id, content_hash, size, file_path, timestamp, 
         context_id, is_checkpoint, compression, original_size, compressed_size, 
         diff_data, full_content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        snapshot.id,
        snapshot.fileId,
        snapshot.nodeId,
        snapshot.contentHash,
        snapshot.size,
        snapshot.metadata.filePath,
        snapshot.metadata.timestamp.getTime(),
        snapshot.metadata.contextId,
        snapshot.metadata.isCheckpoint ? 1 : 0,
        snapshot.metadata.compression,
        snapshot.metadata.originalSize,
        snapshot.metadata.compressedSize,
        snapshot.diffFromParent?.data || null,
        snapshot.fullContent || null,
      ]);

      stmt.free();
      this.logger.debug('Version snapshot saved', { snapshotId: snapshot.id });
    } catch (error) {
      this.logger.error('Failed to save version snapshot', error);
      throw error;
    }
  }

  async getFileVersionHistory(fileId: string): Promise<VersionSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'SELECT * FROM version_snapshots WHERE file_id = ? ORDER BY timestamp DESC'
      );
      stmt.bind([fileId]);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();

      return results.map(row =>
        this.mapRowToVersionSnapshot(row as VersionSnapshotRow)
      );
    } catch (error) {
      this.logger.error('Failed to get file version history', error);
      throw error;
    }
  }

  async saveContextDefinition(context: ContextDefinition): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO context_definitions 
        (id, name, description, color, keywords, parent_context, is_active, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        context.id,
        context.name,
        context.description || null,
        context.color,
        JSON.stringify(context.keywords),
        context.parentContext || null,
        context.isActive ? 1 : 0,
        context.createdAt.getTime(),
        JSON.stringify(context.metadata),
      ]);

      stmt.free();
      this.logger.debug('Context definition saved', { contextId: context.id });
    } catch (error) {
      this.logger.error('Failed to save context definition', error);
      throw error;
    }
  }

  async getAllContexts(): Promise<ContextDefinition[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(
        'SELECT * FROM context_definitions ORDER BY name'
      );
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();

      return results.map(row =>
        this.mapRowToContextDefinition(row as ContextDefinitionRow)
      );
    } catch (error) {
      this.logger.error('Failed to get all contexts', error);
      throw error;
    }
  }

  private mapRowToTimelineNode(row: TimelineNodeRow): TimelineNode {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      parentIds: row.parent_ids ? JSON.parse(row.parent_ids) : [],
      childIds: row.child_ids ? JSON.parse(row.child_ids) : [],
      contextId: row.context_id,
      label: row.label,
      description: row.description,
      isCheckpoint: row.is_checkpoint === 1,
      metadata: {
        fileId: row.file_id,
        filePath: row.file_path,
        wordCount: row.word_count,
        characterCount: row.character_count,
        contentHash: row.content_hash,
        createdBy: row.created_by as 'user' | 'auto',
      },
    };
  }

  private mapRowToVersionSnapshot(row: VersionSnapshotRow): VersionSnapshot {
    const snapshot: VersionSnapshot = {
      id: row.id,
      fileId: row.file_id,
      nodeId: row.node_id,
      contentHash: row.content_hash,
      size: row.size,
      metadata: {
        filePath: row.file_path,
        timestamp: new Date(row.timestamp),
        contextId: row.context_id,
        isCheckpoint: row.is_checkpoint === 1,
        compression: row.compression as 'none' | 'gzip' | 'lz4',
        originalSize: row.original_size,
        compressedSize: row.compressed_size,
      },
    };

    if (row.full_content) {
      snapshot.fullContent = row.full_content;
    }

    if (row.diff_data) {
      snapshot.diffFromParent = {
        algorithm: 'gzip' as const,
        data: new Uint8Array(row.diff_data),
        originalSize: row.original_size,
        compressedSize: row.compressed_size,
      };
    }

    return snapshot;
  }

  private mapRowToContextDefinition(
    row: ContextDefinitionRow
  ): ContextDefinition {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      keywords: row.keywords ? JSON.parse(row.keywords) : [],
      ...(row.parent_context && { parentContext: row.parent_context }),
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.logger.info('Database closed');
    }
  }
}
