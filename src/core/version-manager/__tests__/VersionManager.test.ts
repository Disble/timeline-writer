import { VersionManager } from '../VersionManager';
import { IStorageEngine } from '../../../data/storage/IStorageEngine';
import { mock, MockProxy } from 'jest-mock-extended';
import { FileVersionHistory, TimelineNode, VersionSnapshot } from '../../../data/models/core';

describe('VersionManager', () => {
  let storage: MockProxy<IStorageEngine>;
  let manager: VersionManager;

  beforeEach(() => {
    storage = mock<IStorageEngine>();
    manager = new VersionManager(storage);
  });

  it('should be defined', () => {
    expect(manager).toBeDefined();
  });

  describe('createVersionSnapshot', () => {
    it('should create a full snapshot when there is no parent', async () => {
      const fileId = 'test-file';
      const content = 'Hello, world!';

      storage.getFileHistory.mockResolvedValue(null);

      const snapshot = await manager.createVersionSnapshot(fileId, content);

      expect(snapshot).toBeDefined();
      expect(snapshot.fullContent).toBe(content);
      expect(snapshot.diffFromParent).toBeUndefined();
      expect(storage.saveSnapshot).toHaveBeenCalledWith(snapshot);
    });

    it('should create a diff snapshot when there is a parent', async () => {
      const fileId = 'test-file';
      const oldContent = 'Hello, world!';
      const newContent = 'Hello, beautiful world!';
      const parentNode = { id: 'node1', metadata: { contentHash: 'hash1' } } as TimelineNode;
      const parentSnapshot = { fullContent: oldContent } as VersionSnapshot;

      storage.getFileHistory.mockResolvedValue({ currentVersion: 'node1' } as FileVersionHistory);
      storage.getNode.mockResolvedValue(parentNode);
      storage.getSnapshots.mockResolvedValue([parentSnapshot]);

      const snapshot = await manager.createVersionSnapshot(fileId, newContent);

      expect(snapshot).toBeDefined();
      expect(snapshot.fullContent).toBe(newContent);
      expect(snapshot.diffFromParent).toBeDefined();
      expect(snapshot.diffFromParent?.algorithm).toBe('gzip');
      expect(storage.saveSnapshot).toHaveBeenCalledWith(snapshot);
    });
  });
}); 
