import type { IStorageEngine } from '../../../data/storage/IStorageEngine';
import { Logger } from '../../../utils/logger';
import { TimelineEngine } from '../TimelineEngine';

jest.mock('../../../utils/logger');

describe('TimelineEngine', () => {
  let engine: TimelineEngine;
  let mockStorage: jest.Mocked<IStorageEngine>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockStorage = {
      saveNode: jest.fn(),
    } as any;
    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;
    engine = new TimelineEngine(mockStorage, mockLogger);
  });

  it('should save a node', async () => {
    const node: any = { id: 'node-1' };
    await engine.saveNode(node);
    expect(mockStorage.saveNode).toHaveBeenCalledWith(node);
  });
});
