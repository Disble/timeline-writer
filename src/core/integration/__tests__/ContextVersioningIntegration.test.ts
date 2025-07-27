import { Logger } from '../../../utils/logger';
import { ContextDetectionEngine } from '../../context-detection/ContextDetectionEngine';
import { TimelineEngine } from '../../timeline-engine/TimelineEngine';
import { VersionManager } from '../../version-manager/VersionManager';
import { ContextVersioningIntegration } from '../ContextVersioningIntegration';

jest.mock('../../version-manager/VersionManager');
jest.mock('../../timeline-engine/TimelineEngine');
jest.mock('../../context-detection/ContextDetectionEngine');
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

describe('ContextVersioningIntegration', () => {
  let integration: ContextVersioningIntegration;
  let mockVersionManager: jest.Mocked<VersionManager>;
  let mockTimelineEngine: jest.Mocked<TimelineEngine>;
  let mockContextDetection: jest.Mocked<ContextDetectionEngine>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockVersionManager = new VersionManager(
      {} as any,
      {} as any,
      {} as any,
      {} as any
    ) as jest.Mocked<VersionManager>;
    mockTimelineEngine = new TimelineEngine(
      {} as any,
      {} as any
    ) as jest.Mocked<TimelineEngine>;
    mockContextDetection = new ContextDetectionEngine(
      {} as any
    ) as jest.Mocked<ContextDetectionEngine>;
    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;

    integration = new ContextVersioningIntegration(
      mockVersionManager,
      mockTimelineEngine,
      mockContextDetection,
      mockLogger
    );
  });

  it('should process file change and create snapshot on context shift', async () => {
    mockContextDetection.analyze.mockResolvedValue({
      probability: 0.8,
      signals: [],
      suggestedContext: 'test',
      timestamp: new Date(),
      fileOperation: {} as any,
    });
    await integration.processFileChange('test.md', 'new', 'old');
    expect(mockVersionManager.createVersionSnapshot).toHaveBeenCalled();
  });

  it('should not create snapshot if no context shift', async () => {
    mockContextDetection.analyze.mockResolvedValue({
      probability: 0.2,
      signals: [],
      suggestedContext: 'test',
      timestamp: new Date(),
      fileOperation: {} as any,
    });
    await integration.processFileChange('test.md', 'new', 'old');
    expect(mockVersionManager.createVersionSnapshot).not.toHaveBeenCalled();
  });
});
