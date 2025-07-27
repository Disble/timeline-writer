import { TimelineNode, TimelineBranch } from '../../data/models/core';
import { IStorageEngine } from '../../data/storage/IStorageEngine';
import { Logger } from '../../utils/logger';

export interface NavigationResult {
  success: boolean;
  currentNode: TimelineNode;
  previousNode?: TimelineNode | undefined;
  path?: TimelineNode[] | undefined;
  warnings?: string[];
}

export interface TimelinePath {
  nodes: TimelineNode[];
  branches: TimelineBranch[];
  totalDistance: number;
  pathType: 'linear' | 'branched' | 'merged';
}

export interface MergeStrategy {
  type: 'latest-wins' | 'manual' | 'smart-merge' | 'conflict-markers';
  autoResolve: boolean;
  preserveHistory: boolean;
}

export interface MergeResult {
  success: boolean;
  mergedContent?: string;
  conflicts?: MergeConflict[];
  newNodeId?: string;
  warnings?: string[];
}

export interface MergeConflict {
  type: 'content' | 'metadata' | 'structure';
  description: string;
  sourceA: string;
  sourceB: string;
  suggestedResolution?: string;
  line?: number;
  severity: 'low' | 'medium' | 'high';
}

export interface NavigationOptions {
  includeBranches: boolean;
  maxDepth: number;
  followMerges: boolean;
  preferMainBranch: boolean;
}

const DEFAULT_NAVIGATION_OPTIONS: NavigationOptions = {
  includeBranches: true,
  maxDepth: 100,
  followMerges: true,
  preferMainBranch: false,
};

export class NavigationEngine {
  private storage: IStorageEngine;
  private logger: Logger;
  private navigationHistory: Map<string, TimelineNode[]> = new Map();
  private currentPositions: Map<string, string> = new Map(); // fileId -> nodeId

  constructor(storage: IStorageEngine, logger: Logger) {
    this.storage = storage;
    this.logger = logger;
  }

  async navigateToNode(
    fileId: string,
    targetNodeId: string,
    options: Partial<NavigationOptions> = {}
  ): Promise<NavigationResult> {
    const opts = { ...DEFAULT_NAVIGATION_OPTIONS, ...options };

    try {
      const targetNode = await this.storage.getNode(targetNodeId);
      if (!targetNode) {
        return {
          success: false,
          currentNode: await this.getCurrentNode(fileId),
          warnings: [`Node ${targetNodeId} not found`],
        };
      }

      const currentNodeId = this.currentPositions.get(fileId);
      const previousNode = currentNodeId
        ? await this.storage.getNode(currentNodeId)
        : undefined;

      // Build path to target if needed
      let path: TimelineNode[] | undefined;
      if (previousNode && opts.includeBranches) {
        const pathResult = await this.findPath(
          previousNode.id,
          targetNodeId,
          opts
        );
        path = pathResult?.nodes;
      }

      // Update current position
      this.currentPositions.set(fileId, targetNodeId);

      // Update navigation history
      this.updateNavigationHistory(fileId, targetNode);

      const result: NavigationResult = {
        success: true,
        currentNode: targetNode,
        previousNode: previousNode || undefined,
        path,
      };

      this.logger.debug('Navigation completed', {
        fileId,
        targetNodeId,
        previousNodeId: previousNode?.id,
        pathLength: path?.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Navigation failed', error);
      throw error;
    }
  }

  async navigateRelative(
    fileId: string,
    steps: number,
    options: Partial<NavigationOptions> = {}
  ): Promise<NavigationResult> {
    const currentNodeId = this.currentPositions.get(fileId);
    if (!currentNodeId) {
      const fallbackNode = await this.getCurrentNode(fileId);
      return {
        success: false,
        currentNode: fallbackNode,
        warnings: ['No current position set for file'],
      };
    }

    const currentNode = await this.storage.getNode(currentNodeId);
    if (!currentNode) {
      throw new Error(`Current node ${currentNodeId} not found`);
    }

    try {
      const targetNode = await this.findRelativeNode(
        currentNode,
        steps,
        options
      );
      if (!targetNode) {
        return {
          success: false,
          currentNode,
          warnings: [`Cannot navigate ${steps} steps from current position`],
        };
      }

      return await this.navigateToNode(fileId, targetNode.id, options);
    } catch (error) {
      this.logger.error('Relative navigation failed', error);
      throw error;
    }
  }

  async findPath(
    fromNodeId: string,
    toNodeId: string,
    options: Partial<NavigationOptions> = {}
  ): Promise<TimelinePath | null> {
    const opts = { ...DEFAULT_NAVIGATION_OPTIONS, ...options };

    try {
      const fromNode = await this.storage.getNode(fromNodeId);
      const toNode = await this.storage.getNode(toNodeId);

      if (!fromNode || !toNode) {
        return null;
      }

      // Use BFS to find shortest path
      const path = await this.breadthFirstSearch(fromNode, toNode, opts);
      if (!path) {
        return null;
      }

      // Analyze path type and calculate distance
      const { pathType, branches } = await this.analyzePath(path);
      const totalDistance = this.calculatePathDistance(path);

      return {
        nodes: path,
        branches,
        totalDistance,
        pathType,
      };
    } catch (error) {
      this.logger.error('Path finding failed', error);
      return null;
    }
  }

  async createBranch(
    fromNodeId: string,
    branchName: string,
    fileId: string
  ): Promise<TimelineBranch> {
    try {
      const fromNode = await this.storage.getNode(fromNodeId);
      if (!fromNode) {
        throw new Error(`Source node ${fromNodeId} not found`);
      }

      const branch: TimelineBranch = {
        id: this.generateBranchId(),
        name: branchName,
        parentNodeId: fromNodeId,
        nodes: [fromNodeId],
        isActive: false,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      await this.storage.saveBranch(branch);

      this.logger.info('Branch created', {
        branchId: branch.id,
        branchName,
        fromNodeId,
        fileId,
      });

      return branch;
    } catch (error) {
      this.logger.error('Branch creation failed', error);
      throw error;
    }
  }

  async mergeBranches(
    sourceBranchId: string,
    targetBranchId: string,
    strategy: MergeStrategy,
    _fileId: string
  ): Promise<MergeResult> {
    try {
      const sourceBranch = await this.storage.getBranch(sourceBranchId);
      const targetBranch = await this.storage.getBranch(targetBranchId);

      if (!sourceBranch || !targetBranch) {
        return {
          success: false,
          warnings: ['One or both branches not found'],
        };
      }

      // Get latest nodes from both branches
      const sourceNodeId = sourceBranch.nodes[sourceBranch.nodes.length - 1];
      const targetNodeId = targetBranch.nodes[targetBranch.nodes.length - 1];

      if (!sourceNodeId || !targetNodeId) {
        return {
          success: false,
          warnings: ['Branches have no nodes'],
        };
      }

      const sourceNode = await this.storage.getNode(sourceNodeId);
      const targetNode = await this.storage.getNode(targetNodeId);

      if (!sourceNode || !targetNode) {
        return {
          success: false,
          warnings: ['Branch nodes not found'],
        };
      }

      // Get content for both nodes
      const sourceContent = await this.getNodeContent(sourceNode);
      const targetContent = await this.getNodeContent(targetNode);

      // Perform merge based on strategy
      const mergeResult = await this.performMerge(
        sourceContent,
        targetContent,
        strategy
      );

      if (mergeResult.success && mergeResult.mergedContent) {
        // Create new merged node
        const mergedNodeId = await this.createMergedNode(
          targetNode,
          mergeResult.mergedContent,
          [sourceNodeId, targetNodeId]
        );

        mergeResult.newNodeId = mergedNodeId;

        // Update target branch to include merged node
        targetBranch.nodes.push(mergedNodeId);
        targetBranch.lastModified = new Date();
        await this.storage.saveBranch(targetBranch);

        // Optionally deactivate source branch
        if (strategy.preserveHistory) {
          sourceBranch.isActive = false;
          await this.storage.saveBranch(sourceBranch);
        }
      }

      this.logger.info('Branch merge completed', {
        sourceBranchId,
        targetBranchId,
        success: mergeResult.success,
        conflictsCount: mergeResult.conflicts?.length || 0,
      });

      return mergeResult;
    } catch (error) {
      this.logger.error('Branch merge failed', error);
      throw error;
    }
  }

  private async findRelativeNode(
    currentNode: TimelineNode,
    steps: number,
    options: Partial<NavigationOptions>
  ): Promise<TimelineNode | null> {
    const opts = { ...DEFAULT_NAVIGATION_OPTIONS, ...options };
    let current = currentNode;
    const direction = steps > 0 ? 'forward' : 'backward';
    const stepsAbs = Math.abs(steps);

    for (let i = 0; i < stepsAbs; i++) {
      const next = await this.getAdjacentNode(current, direction, opts);
      if (!next) {
        return null;
      }
      current = next;
    }

    return current;
  }

  private async getAdjacentNode(
    node: TimelineNode,
    direction: 'forward' | 'backward',
    options: NavigationOptions
  ): Promise<TimelineNode | null> {
    if (direction === 'forward') {
      // Go to child node (prefer main branch if multiple children)
      if (node.childIds.length === 0) {
        return null;
      }

      const childId = options.preferMainBranch
        ? await this.findMainBranchChild(node)
        : node.childIds[0];

      return childId ? await this.storage.getNode(childId) : null;
    } else {
      // Go to parent node
      if (node.parentIds.length === 0) {
        return null;
      }

      const parentId = node.parentIds[0]; // Take first parent
      return parentId ? await this.storage.getNode(parentId) : null;
    }
  }

  private async breadthFirstSearch(
    fromNode: TimelineNode,
    toNode: TimelineNode,
    options: NavigationOptions
  ): Promise<TimelineNode[] | null> {
    const visited = new Set<string>();
    const queue: { node: TimelineNode; path: TimelineNode[] }[] = [
      { node: fromNode, path: [fromNode] },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (current.node.id === toNode.id) {
        return current.path;
      }

      if (visited.has(current.node.id)) {
        continue;
      }

      visited.add(current.node.id);

      if (current.path.length >= options.maxDepth) {
        continue;
      }

      // Add child nodes to queue
      for (const childId of current.node.childIds) {
        if (!visited.has(childId)) {
          const childNode = await this.storage.getNode(childId);
          if (childNode) {
            queue.push({
              node: childNode,
              path: [...current.path, childNode],
            });
          }
        }
      }

      // Add parent nodes to queue (for backward navigation)
      for (const parentId of current.node.parentIds) {
        if (!visited.has(parentId)) {
          const parentNode = await this.storage.getNode(parentId);
          if (parentNode) {
            queue.push({
              node: parentNode,
              path: [...current.path, parentNode],
            });
          }
        }
      }
    }

    return null;
  }

  private async analyzePath(path: TimelineNode[]): Promise<{
    pathType: 'linear' | 'branched' | 'merged';
    branches: TimelineBranch[];
  }> {
    let pathType: 'linear' | 'branched' | 'merged' = 'linear';
    const branches: TimelineBranch[] = [];

    // Check for branching and merging
    for (const node of path) {
      if (node.childIds.length > 1) {
        pathType = 'branched';
      }
      if (node.parentIds.length > 1) {
        pathType = 'merged';
      }
    }

    // TODO: Collect actual branch objects
    return { pathType, branches };
  }

  private calculatePathDistance(path: TimelineNode[]): number {
    // Simple distance calculation based on node count
    // Could be enhanced with timestamp differences, content changes, etc.
    return path.length - 1;
  }

  private async performMerge(
    contentA: string,
    contentB: string,
    strategy: MergeStrategy
  ): Promise<MergeResult> {
    switch (strategy.type) {
      case 'latest-wins':
        return {
          success: true,
          mergedContent: contentB, // Assume B is later
          conflicts: [],
        };

      case 'smart-merge':
        return await this.performSmartMerge(contentA, contentB);

      case 'conflict-markers':
        return this.performConflictMarkerMerge(contentA, contentB);

      case 'manual':
        return {
          success: false,
          conflicts: await this.detectConflicts(contentA, contentB),
        };

      default:
        throw new Error(`Unknown merge strategy: ${strategy.type}`);
    }
  }

  private async performSmartMerge(
    contentA: string,
    contentB: string
  ): Promise<MergeResult> {
    // Simple implementation - could be enhanced with diff3 algorithm
    const linesA = contentA.split('\n');
    const linesB = contentB.split('\n');
    const merged: string[] = [];
    const conflicts: MergeConflict[] = [];

    const maxLines = Math.max(linesA.length, linesB.length);

    for (let i = 0; i < maxLines; i++) {
      const lineA = linesA[i] || '';
      const lineB = linesB[i] || '';

      if (lineA === lineB) {
        merged.push(lineA);
      } else if (!lineA) {
        merged.push(lineB); // Addition in B
      } else if (!lineB) {
        merged.push(lineA); // Addition in A
      } else {
        // Conflict - for now, choose B
        merged.push(lineB);
        conflicts.push({
          type: 'content',
          description: `Line ${i + 1} differs between versions`,
          sourceA: lineA,
          sourceB: lineB,
          line: i + 1,
          severity: 'medium',
        });
      }
    }

    return {
      success: conflicts.length === 0,
      mergedContent: merged.join('\n'),
      conflicts,
    };
  }

  private performConflictMarkerMerge(
    contentA: string,
    contentB: string
  ): MergeResult {
    const linesA = contentA.split('\n');
    const linesB = contentB.split('\n');
    const merged: string[] = [];

    // Simple conflict marker implementation
    if (contentA !== contentB) {
      merged.push('<<<<<<< Version A');
      merged.push(...linesA);
      merged.push('=======');
      merged.push(...linesB);
      merged.push('>>>>>>> Version B');
    } else {
      merged.push(...linesA);
    }

    return {
      success: true,
      mergedContent: merged.join('\n'),
      conflicts: [],
    };
  }

  private async detectConflicts(
    contentA: string,
    contentB: string
  ): Promise<MergeConflict[]> {
    const conflicts: MergeConflict[] = [];

    if (contentA !== contentB) {
      conflicts.push({
        type: 'content',
        description: 'Content differs between versions',
        sourceA: `${contentA.slice(0, 100)}...`,
        sourceB: `${contentB.slice(0, 100)}...`,
        severity: 'high',
      });
    }

    return conflicts;
  }

  private async getNodeContent(node: TimelineNode): Promise<string> {
    // Get content from the latest snapshot of this node
    const snapshots = await this.storage.getSnapshots(node.id);
    if (snapshots.length === 0) {
      return '';
    }

    const latestSnapshot = snapshots[0]; // Assume sorted by timestamp
    // TODO: Implement content reconstruction from snapshot
    return latestSnapshot?.fullContent || '';
  }

  private async createMergedNode(
    baseNode: TimelineNode,
    mergedContent: string,
    sourceNodeIds: string[]
  ): Promise<string> {
    // Create a new node representing the merge
    const mergedNode: TimelineNode = {
      id: this.generateNodeId(),
      timestamp: new Date(),
      parentIds: sourceNodeIds,
      childIds: [],
      contextId: baseNode.contextId,
      label: `Merge: ${sourceNodeIds.join(' + ')}`,
      isCheckpoint: true,
      metadata: {
        ...baseNode.metadata,
        mergeSource: sourceNodeIds,
        isMergeNode: true,
      },
    };

    await this.storage.saveNode(mergedNode);

    // TODO: Create snapshot with merged content
    // This would require integration with VersionManager

    return mergedNode.id;
  }

  private async getCurrentNode(fileId: string): Promise<TimelineNode> {
    // Get current node or create a default one
    const currentNodeId = this.currentPositions.get(fileId);
    if (currentNodeId) {
      const node = await this.storage.getNode(currentNodeId);
      if (node) return node;
    }

    // Create a default node
    const defaultNode: TimelineNode = {
      id: this.generateNodeId(),
      timestamp: new Date(),
      parentIds: [],
      childIds: [],
      contextId: 'default',
      label: 'Initial state',
      isCheckpoint: false,
      metadata: {
        fileId,
        filePath: fileId,
        wordCount: 0,
        characterCount: 0,
        contentHash: '',
        createdBy: 'system',
      },
    };

    await this.storage.saveNode(defaultNode);
    this.currentPositions.set(fileId, defaultNode.id);

    return defaultNode;
  }

  private async findMainBranchChild(
    node: TimelineNode
  ): Promise<string | null> {
    // TODO: Implement logic to find main branch child
    // For now, return first child
    return node.childIds[0] || null;
  }

  private updateNavigationHistory(fileId: string, node: TimelineNode): void {
    const history = this.navigationHistory.get(fileId) || [];
    history.push(node);

    // Keep only last 50 nodes in history
    if (history.length > 50) {
      history.shift();
    }

    this.navigationHistory.set(fileId, history);
  }

  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBranchId(): string {
    return `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentPosition(fileId: string): string | undefined {
    return this.currentPositions.get(fileId);
  }

  getNavigationHistory(fileId: string): TimelineNode[] {
    return this.navigationHistory.get(fileId) || [];
  }

  async getTimelineStatistics(fileId: string): Promise<{
    totalNodes: number;
    totalBranches: number;
    maxDepth: number;
    branchPoints: number;
    mergePoints: number;
  }> {
    // TODO: Implement comprehensive timeline statistics
    const history = await this.storage.getFileHistory(fileId);
    return {
      totalNodes: history?.versions.length || 0,
      totalBranches: history?.branches.length || 0,
      maxDepth: 0,
      branchPoints: 0,
      mergePoints: 0,
    };
  }
}
