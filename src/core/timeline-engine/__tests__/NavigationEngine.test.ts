import type { TimelineNode } from '../../../data/models/core';
import type { IStorageEngine } from '../../../data/storage/IStorageEngine';
import { Logger } from '../../../utils/logger';
import { NavigationEngine } from '../NavigationEngine';

jest.mock('../../../utils/logger');

describe('NavigationEngine', () => {
  let engine: NavigationEngine;
  let mockStorage: jest.Mocked<IStorageEngine>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockStorage = {
      getNode: jest.fn(),
      getSnapshots: jest.fn().mockResolvedValue([]),
      getFileHistory: jest.fn().mockResolvedValue({ fileId: 'test.md' } as any),
      getNodes: jest.fn().mockResolvedValue([]),
    } as any;
    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;
    engine = new NavigationEngine(mockStorage, mockLogger);
  });

  it('should navigate to an existing node', async () => {
    const node: TimelineNode = {
      id: 'node-1',
      timestamp: new Date(),
      parentIds: [],
      childIds: [],
      contextId: 'default',
      label: 'Test Node',
      isCheckpoint: true,
      metadata: {} as any,
    };
    mockStorage.getNode.mockResolvedValue(node);

    const result = await engine.navigateToNode('test.md', 'node-1');
    expect(result.success).toBe(true);
    expect(mockStorage.getNode).toHaveBeenCalledWith('node-1');
  });

  it('should handle navigation to a non-existent node', async () => {
    mockStorage.getNode.mockResolvedValue(null);
    const result = await engine.navigateToNode('test.md', 'non-existent');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });
});
