import type { IStorageEngine } from '../../../data/storage/IStorageEngine';
import { Logger } from '../../../utils/logger';
import { CompressionEngine } from '../CompressionEngine';
import { DiffEngine } from '../DiffEngine';
import { VersionManager } from '../VersionManager';

jest.mock('../DiffEngine');
jest.mock('../CompressionEngine');
jest.mock('../../../utils/logger', () => ({
  Logger: {
    getInstance: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe('VersionManager', () => {
  let manager: VersionManager;
  let mockStorage: jest.Mocked<IStorageEngine>;
  let mockDiffEngine: jest.Mocked<DiffEngine>;
  let mockCompressionEngine: jest.Mocked<CompressionEngine>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockStorage = {
      getFileHistory: jest.fn(),
      getNode: jest.fn(),
      saveSnapshotObject: jest.fn(),
      getSnapshots: jest.fn(),
    } as any;
    mockDiffEngine = new DiffEngine() as jest.Mocked<DiffEngine>;
    mockCompressionEngine =
      new CompressionEngine() as jest.Mocked<CompressionEngine>;
    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;

    manager = new VersionManager(
      mockStorage,
      mockDiffEngine,
      mockCompressionEngine,
      mockLogger
    );

    // Mock return values
    mockStorage.getFileHistory.mockResolvedValue({
      currentVersion: 'parent-id',
    } as any);
    mockStorage.getNode.mockResolvedValue({ content: 'parent content' } as any);
    mockStorage.getSnapshots.mockResolvedValue([
      {
        id: 'parent-snapshot-id',
        fullContent: 'parent content',
        metadata: { isCheckpoint: false },
      },
    ] as any);
    mockDiffEngine.createPatch.mockReturnValue('test-patch');
    mockCompressionEngine.compress.mockReturnValue(new Uint8Array([1, 2, 3]));
  });

  it('should create a new snapshot with a patch', async () => {
    const snapshot = await manager.createVersionSnapshot(
      'test.md',
      'new content',
      false
    );

    expect(snapshot.metadata.isCheckpoint).toBe(false);
    expect(snapshot.diffFromParent).toBeDefined();
    expect(snapshot.diffFromParent?.algorithm).toBe('gzip');
    expect(snapshot.diffFromParent?.data).toEqual(new Uint8Array([1, 2, 3]));
    expect(snapshot.fullContent).toBeUndefined();
    expect(mockStorage.saveSnapshotObject).toHaveBeenCalledWith(snapshot);
  });

  it('should create a new snapshot with full content when no parent exists', async () => {
    // Mock no parent snapshot
    mockStorage.getSnapshots.mockResolvedValue([]);

    const snapshot = await manager.createVersionSnapshot(
      'test.md',
      'new content',
      true
    );

    expect(snapshot.metadata.isCheckpoint).toBe(true);
    expect(snapshot.diffFromParent).toBeUndefined();
    expect(snapshot.fullContent).toBe('new content');
    expect(mockStorage.saveSnapshotObject).toHaveBeenCalledWith(snapshot);
  });
});
