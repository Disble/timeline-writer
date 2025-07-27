import { TimelineEngine } from '../TimelineEngine';
import { IStorageEngine } from '../../../data/storage/IStorageEngine';
import { mock, MockProxy } from 'jest-mock-extended';
import { FileMetadata } from '../../../data/models/core';

describe('TimelineEngine', () => {
  let storage: MockProxy<IStorageEngine>;
  let engine: TimelineEngine;

  beforeEach(() => {
    storage = mock<IStorageEngine>();
    engine = new TimelineEngine(storage);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('createNode', () => {
    it('should create a new node and update the file history', async () => {
      const fileId = 'test-file';
      const label = 'Test Node';
      const isCheckpoint = false;

      storage.getFileHistory.mockResolvedValue(null);
      storage.getNode.mockResolvedValue(null);

      const node = await engine.createNode(fileId, label, isCheckpoint);

      expect(node).toBeDefined();
      expect(node.label).toBe(label);
      expect(node.parentIds).toEqual([]);
      expect(storage.saveNode).toHaveBeenCalledWith(node);
      expect(storage.saveFileHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId,
          currentVersion: node.id,
        }),
      );
    });
  });

  describe('getTimeline', () => {
    it('should return the file history', async () => {
      const fileId = 'test-file';
      const history = { fileId, currentVersion: '1', versions: [], branches: [], fileName: 'test', lastModified: new Date(), metadata: {} as FileMetadata };
      storage.getFileHistory.mockResolvedValue(history);

      const result = await engine.getTimeline(fileId);

      expect(result).toEqual(history);
      expect(storage.getFileHistory).toHaveBeenCalledWith(fileId);
    });
  });
}); 
