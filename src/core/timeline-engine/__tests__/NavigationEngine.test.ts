import type { TimelineBranch, TimelineNode } from '../../../data/models/core';
import type { IStorageEngine } from '../../../data/storage/IStorageEngine';
import type { Logger } from '../../../utils/logger';
import { type MergeStrategy, NavigationEngine } from '../NavigationEngine';

// Mock the storage engine
const mockStorage = {
  getNode: jest.fn(),
  saveNode: jest.fn(),
  getBranch: jest.fn(),
  saveBranch: jest.fn(),
  getSnapshots: jest.fn(),
  getFileHistory: jest.fn(),
} as jest.Mocked<IStorageEngine>;

describe('NavigationEngine', () => {
  let engine: NavigationEngine;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    engine = new NavigationEngine(mockStorage, mockLogger);
  });

  describe('navigateToNode', () => {
    it('should navigate to existing node successfully', async () => {
      const targetNode: TimelineNode = {
        id: 'target-node',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'context-1',
        label: 'Target Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-123',
          createdBy: 'user',
        },
      };

      mockStorage.getNode.mockResolvedValue(targetNode);

      const result = await engine.navigateToNode('test-file.md', 'target-node');

      expect(result.success).toBe(true);
      expect(result.currentNode).toEqual(targetNode);
      expect(engine.getCurrentPosition('test-file.md')).toBe('target-node');
    });

    it('should handle navigation to non-existent node', async () => {
      mockStorage.getNode.mockResolvedValue(null);

      // Mock a default node creation
      const defaultNode: TimelineNode = {
        id: 'default-node',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'default',
        label: 'Initial state',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 0,
          characterCount: 0,
          contentHash: '',
          createdBy: 'system',
        },
      };

      mockStorage.getNode
        .mockResolvedValueOnce(null)
        .mockResolvedValue(defaultNode);

      const result = await engine.navigateToNode(
        'test-file.md',
        'non-existent'
      );

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Node non-existent not found');
    });

    it('should build path between nodes when requested', async () => {
      const currentNode: TimelineNode = {
        id: 'current-node',
        timestamp: new Date(),
        parentIds: [],
        childIds: ['target-node'],
        contextId: 'context-1',
        label: 'Current Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 50,
          characterCount: 250,
          contentHash: 'hash-456',
          createdBy: 'user',
        },
      };

      const targetNode: TimelineNode = {
        id: 'target-node',
        timestamp: new Date(),
        parentIds: ['current-node'],
        childIds: [],
        contextId: 'context-1',
        label: 'Target Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-123',
          createdBy: 'user',
        },
      };

      // Set current position first
      mockStorage.getNode.mockResolvedValueOnce(currentNode);
      await engine.navigateToNode('test-file.md', 'current-node');

      // Now navigate to target
      mockStorage.getNode
        .mockResolvedValueOnce(targetNode) // Target node lookup
        .mockResolvedValueOnce(currentNode) // Current node lookup
        .mockResolvedValueOnce(currentNode) // Path finding - from node
        .mockResolvedValueOnce(targetNode) // Path finding - to node
        .mockResolvedValueOnce(targetNode); // BFS traversal

      const result = await engine.navigateToNode('test-file.md', 'target-node');

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
      expect(result.previousNode?.id).toBe('current-node');
    });
  });

  describe('navigateRelative', () => {
    it('should navigate forward one step', async () => {
      const currentNode: TimelineNode = {
        id: 'current-node',
        timestamp: new Date(),
        parentIds: [],
        childIds: ['next-node'],
        contextId: 'context-1',
        label: 'Current Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 50,
          characterCount: 250,
          contentHash: 'hash-456',
          createdBy: 'user',
        },
      };

      const nextNode: TimelineNode = {
        id: 'next-node',
        timestamp: new Date(),
        parentIds: ['current-node'],
        childIds: [],
        contextId: 'context-1',
        label: 'Next Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-123',
          createdBy: 'user',
        },
      };

      // Set current position
      mockStorage.getNode.mockResolvedValueOnce(currentNode);
      await engine.navigateToNode('test-file.md', 'current-node');

      // Navigate forward
      mockStorage.getNode
        .mockResolvedValueOnce(currentNode) // Get current node
        .mockResolvedValueOnce(nextNode) // Get next node
        .mockResolvedValueOnce(nextNode); // Final navigation

      const result = await engine.navigateRelative('test-file.md', 1);

      expect(result.success).toBe(true);
      expect(result.currentNode.id).toBe('next-node');
    });

    it('should navigate backward one step', async () => {
      const parentNode: TimelineNode = {
        id: 'parent-node',
        timestamp: new Date(),
        parentIds: [],
        childIds: ['current-node'],
        contextId: 'context-1',
        label: 'Parent Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 50,
          characterCount: 250,
          contentHash: 'hash-789',
          createdBy: 'user',
        },
      };

      const currentNode: TimelineNode = {
        id: 'current-node',
        timestamp: new Date(),
        parentIds: ['parent-node'],
        childIds: [],
        contextId: 'context-1',
        label: 'Current Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-456',
          createdBy: 'user',
        },
      };

      // Set current position
      mockStorage.getNode.mockResolvedValueOnce(currentNode);
      await engine.navigateToNode('test-file.md', 'current-node');

      // Navigate backward
      mockStorage.getNode
        .mockResolvedValueOnce(currentNode) // Get current node
        .mockResolvedValueOnce(parentNode) // Get parent node
        .mockResolvedValueOnce(parentNode); // Final navigation

      const result = await engine.navigateRelative('test-file.md', -1);

      expect(result.success).toBe(true);
      expect(result.currentNode.id).toBe('parent-node');
    });

    it('should handle navigation beyond available nodes', async () => {
      const currentNode: TimelineNode = {
        id: 'current-node',
        timestamp: new Date(),
        parentIds: [],
        childIds: [], // No children
        contextId: 'context-1',
        label: 'Current Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-456',
          createdBy: 'user',
        },
      };

      // Set current position
      mockStorage.getNode.mockResolvedValueOnce(currentNode);
      await engine.navigateToNode('test-file.md', 'current-node');

      // Try to navigate forward when no children exist
      mockStorage.getNode.mockResolvedValueOnce(currentNode);

      const result = await engine.navigateRelative('test-file.md', 1);

      expect(result.success).toBe(false);
      expect(result.warnings).toContain(
        'Cannot navigate 1 steps from current position'
      );
    });
  });

  describe('createBranch', () => {
    it('should create a new branch successfully', async () => {
      const fromNode: TimelineNode = {
        id: 'from-node',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'context-1',
        label: 'From Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-123',
          createdBy: 'user',
        },
      };

      mockStorage.getNode.mockResolvedValue(fromNode);
      mockStorage.saveBranch.mockResolvedValue(undefined);

      const result = await engine.createBranch(
        'from-node',
        'feature-branch',
        'test-file.md'
      );

      expect(result.name).toBe('feature-branch');
      expect(result.parentNodeId).toBe('from-node');
      expect(result.nodes).toContain('from-node');
      expect(result.isActive).toBe(false);
      expect(mockStorage.saveBranch).toHaveBeenCalled();
    });

    it('should handle creating branch from non-existent node', async () => {
      mockStorage.getNode.mockResolvedValue(null);

      await expect(
        engine.createBranch('non-existent', 'branch-name', 'test-file.md')
      ).rejects.toThrow('Source node non-existent not found');
    });
  });

  describe('mergeBranches', () => {
    it('should merge branches with latest-wins strategy', async () => {
      const sourceBranch: TimelineBranch = {
        id: 'source-branch',
        name: 'Source Branch',
        parentNodeId: 'parent-node',
        nodes: ['parent-node', 'source-node'],
        isActive: true,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const targetBranch: TimelineBranch = {
        id: 'target-branch',
        name: 'Target Branch',
        parentNodeId: 'parent-node',
        nodes: ['parent-node', 'target-node'],
        isActive: true,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const sourceNode: TimelineNode = {
        id: 'source-node',
        timestamp: new Date(),
        parentIds: ['parent-node'],
        childIds: [],
        contextId: 'context-1',
        label: 'Source Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-source',
          createdBy: 'user',
        },
      };

      const targetNode: TimelineNode = {
        id: 'target-node',
        timestamp: new Date(),
        parentIds: ['parent-node'],
        childIds: [],
        contextId: 'context-1',
        label: 'Target Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 120,
          characterCount: 600,
          contentHash: 'hash-target',
          createdBy: 'user',
        },
      };

      const strategy: MergeStrategy = {
        type: 'latest-wins',
        autoResolve: true,
        preserveHistory: true,
      };

      mockStorage.getBranch
        .mockResolvedValueOnce(sourceBranch)
        .mockResolvedValueOnce(targetBranch);
      mockStorage.getNode
        .mockResolvedValueOnce(sourceNode)
        .mockResolvedValueOnce(targetNode);

      // Mock snapshots for each node to provide different content
      mockStorage.getSnapshots.mockImplementation((nodeId: string) => {
        if (nodeId === 'source-node') {
          return Promise.resolve([{ fullContent: 'source content' }]);
        } else if (nodeId === 'target-node') {
          return Promise.resolve([{ fullContent: 'target content' }]);
        }
        return Promise.resolve([]);
      });

      mockStorage.saveNode.mockResolvedValue(undefined);
      mockStorage.saveBranch.mockResolvedValue(undefined);

      const result = await engine.mergeBranches(
        'source-branch',
        'target-branch',
        strategy,
        'test-file.md'
      );

      expect(result.success).toBe(true);
      expect(result.mergedContent).toBeDefined();
      expect(result.newNodeId).toBeDefined();
      expect(mockStorage.saveBranch).toHaveBeenCalledTimes(2); // Update both branches
    });

    it('should detect merge conflicts with manual strategy', async () => {
      const sourceBranch: TimelineBranch = {
        id: 'source-branch',
        name: 'Source Branch',
        parentNodeId: 'parent-node',
        nodes: ['parent-node', 'source-node'],
        isActive: true,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const targetBranch: TimelineBranch = {
        id: 'target-branch',
        name: 'Target Branch',
        parentNodeId: 'parent-node',
        nodes: ['parent-node', 'target-node'],
        isActive: true,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const sourceNode: TimelineNode = {
        id: 'source-node',
        timestamp: new Date(),
        parentIds: ['parent-node'],
        childIds: [],
        contextId: 'context-1',
        label: 'Source Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-source',
          createdBy: 'user',
        },
      };

      const targetNode: TimelineNode = {
        id: 'target-node',
        timestamp: new Date(),
        parentIds: ['parent-node'],
        childIds: [],
        contextId: 'context-1',
        label: 'Target Node',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 120,
          characterCount: 600,
          contentHash: 'hash-target',
          createdBy: 'user',
        },
      };

      const strategy: MergeStrategy = {
        type: 'manual',
        autoResolve: false,
        preserveHistory: true,
      };

      mockStorage.getBranch
        .mockResolvedValueOnce(sourceBranch)
        .mockResolvedValueOnce(targetBranch);
      mockStorage.getNode
        .mockResolvedValueOnce(sourceNode)
        .mockResolvedValueOnce(targetNode);

      // Mock snapshots for each node to provide different content that will conflict
      mockStorage.getSnapshots.mockImplementation((nodeId: string) => {
        if (nodeId === 'source-node') {
          return Promise.resolve([
            { fullContent: 'source content line 1\nsource content line 2' },
          ]);
        } else if (nodeId === 'target-node') {
          return Promise.resolve([
            { fullContent: 'target content line 1\ntarget content line 2' },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await engine.mergeBranches(
        'source-branch',
        'target-branch',
        strategy,
        'test-file.md'
      );

      expect(result.success).toBe(false);
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts?.length).toBeGreaterThan(0);
    });

    it('should handle missing branches gracefully', async () => {
      mockStorage.getBranch.mockResolvedValue(null);

      const strategy: MergeStrategy = {
        type: 'latest-wins',
        autoResolve: true,
        preserveHistory: true,
      };

      const result = await engine.mergeBranches(
        'non-existent-source',
        'non-existent-target',
        strategy,
        'test-file.md'
      );

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('One or both branches not found');
    });
  });

  describe('findPath', () => {
    it('should find path between connected nodes', async () => {
      const nodeA: TimelineNode = {
        id: 'node-a',
        timestamp: new Date(),
        parentIds: [],
        childIds: ['node-b'],
        contextId: 'context-1',
        label: 'Node A',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 50,
          characterCount: 250,
          contentHash: 'hash-a',
          createdBy: 'user',
        },
      };

      const nodeB: TimelineNode = {
        id: 'node-b',
        timestamp: new Date(),
        parentIds: ['node-a'],
        childIds: [],
        contextId: 'context-1',
        label: 'Node B',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-b',
          createdBy: 'user',
        },
      };

      mockStorage.getNode
        .mockResolvedValueOnce(nodeA) // From node
        .mockResolvedValueOnce(nodeB) // To node
        .mockResolvedValueOnce(nodeB); // BFS traversal

      const path = await engine.findPath('node-a', 'node-b');

      expect(path).toBeDefined();
      expect(path?.nodes).toHaveLength(2);
      expect(path?.nodes[0].id).toBe('node-a');
      expect(path?.nodes[1].id).toBe('node-b');
      expect(path?.totalDistance).toBe(1);
    });

    it('should return null for disconnected nodes', async () => {
      const nodeA: TimelineNode = {
        id: 'node-a',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'context-1',
        label: 'Node A',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 50,
          characterCount: 250,
          contentHash: 'hash-a',
          createdBy: 'user',
        },
      };

      const nodeB: TimelineNode = {
        id: 'node-b',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'context-1',
        label: 'Node B',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-b',
          createdBy: 'user',
        },
      };

      mockStorage.getNode
        .mockResolvedValueOnce(nodeA)
        .mockResolvedValueOnce(nodeB);

      const path = await engine.findPath('node-a', 'node-b');

      expect(path).toBeNull();
    });
  });

  describe('getTimelineStatistics', () => {
    it('should return basic timeline statistics', async () => {
      mockStorage.getFileHistory.mockResolvedValue({
        fileId: 'test-file.md',
        fileName: 'test-file.md',
        currentVersion: 'current-node',
        versions: ['node-1', 'node-2', 'node-3'],
        branches: [
          {
            id: 'branch-1',
            name: 'Branch 1',
            parentNodeId: 'node-1',
            nodes: ['node-1', 'node-2'],
            isActive: true,
            createdAt: new Date(),
            lastModified: new Date(),
          },
        ],
        lastModified: new Date(),
        metadata: {
          filePath: 'test-file.md',
          timestamp: new Date(),
          contextId: 'default',
          isCheckpoint: false,
          compression: 'none',
          originalSize: 0,
          compressedSize: 0,
        },
      });

      const stats = await engine.getTimelineStatistics('test-file.md');

      expect(stats.totalNodes).toBe(3);
      expect(stats.totalBranches).toBe(1);
      expect(stats.maxDepth).toBeDefined();
      expect(stats.branchPoints).toBeDefined();
      expect(stats.mergePoints).toBeDefined();
    });
  });

  describe('navigation history', () => {
    it('should track navigation history', async () => {
      const node1: TimelineNode = {
        id: 'node-1',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'context-1',
        label: 'Node 1',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 50,
          characterCount: 250,
          contentHash: 'hash-1',
          createdBy: 'user',
        },
      };

      const node2: TimelineNode = {
        id: 'node-2',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'context-1',
        label: 'Node 2',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 100,
          characterCount: 500,
          contentHash: 'hash-2',
          createdBy: 'user',
        },
      };

      mockStorage.getNode
        .mockResolvedValueOnce(node1)
        .mockResolvedValueOnce(node2);

      await engine.navigateToNode('test-file.md', 'node-1');
      await engine.navigateToNode('test-file.md', 'node-2');

      const history = engine.getNavigationHistory('test-file.md');

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('node-1');
      expect(history[1].id).toBe('node-2');
    });
  });
});
