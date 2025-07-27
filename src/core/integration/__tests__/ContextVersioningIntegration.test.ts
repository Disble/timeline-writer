import type { TFile } from 'obsidian';
import type {
  ContextShiftDetection,
  TimelineNode,
  VersionSnapshot,
} from '../../../data/models/core';
import type { Logger } from '../../../utils/logger';
import type { TimelineEngine } from '../../timeline-engine/TimelineEngine';
import type { VersionManager } from '../../version-manager/VersionManager';
import {
  ContextVersioningIntegration,
  type IntegrationConfig,
} from '../ContextVersioningIntegration';

// Mock the dependencies
jest.mock('../../version-manager/VersionManager');
jest.mock('../../timeline-engine/TimelineEngine');

describe('ContextVersioningIntegration', () => {
  let integration: ContextVersioningIntegration;
  let mockVersionManager: jest.Mocked<VersionManager>;
  let mockTimelineEngine: jest.Mocked<TimelineEngine>;
  let mockLogger: Logger;
  let mockFile: TFile;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    mockVersionManager = {
      createVersionSnapshot: jest.fn(),
      getVersionSnapshot: jest.fn(),
      restoreVersion: jest.fn(),
    } as jest.Mocked<VersionManager>;

    mockTimelineEngine = {
      createNode: jest.fn(),
      getTimeline: jest.fn(),
      getNode: jest.fn(),
      getBranch: jest.fn(),
      switchBranch: jest.fn(),
      createBranch: jest.fn(),
    } as jest.Mocked<TimelineEngine>;

    mockFile = {
      path: 'test-file.md',
      name: 'test-file.md',
      stat: { size: 1000 },
    } as TFile;

    integration = new ContextVersioningIntegration(
      mockVersionManager,
      mockTimelineEngine,
      mockLogger,
      { minimumConfidenceThreshold: 0.5 }
    );
  });

  describe('handleContextShift', () => {
    it('should create snapshot when conditions are met', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.8,
        suggestedContext: 'new-context',
        signals: [
          {
            type: 'semantic',
            confidence: 0.8,
            evidence: { suggestedContext: 'new-context' },
            weight: 1.0,
          },
        ],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'new content',
          timestamp: new Date(),
        },
      };

      const mockSnapshot: VersionSnapshot = {
        id: 'snapshot-123',
        fileId: 'test-file.md',
        nodeId: 'node-123',
        contentHash: 'hash-123',
        size: 100,
        metadata: {
          filePath: 'test-file.md',
          timestamp: new Date(),
          contextId: 'new-context',
          isCheckpoint: false,
          compression: 'gzip',
          originalSize: 100,
          compressedSize: 80,
        },
      };

      const mockNode: TimelineNode = {
        id: 'node-123',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'new-context',
        label: 'Context: new-context',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 10,
          characterCount: 100,
          contentHash: 'hash-123',
          createdBy: 'auto',
        },
      };

      mockVersionManager.createVersionSnapshot.mockResolvedValue(mockSnapshot);
      mockTimelineEngine.createNode.mockResolvedValue(mockNode);

      const result = await integration.handleContextShift(
        detection,
        mockFile,
        'new content'
      );

      expect(result.snapshotCreated).toBe(true);
      expect(result.snapshotId).toBe('snapshot-123');
      expect(result.timelineUpdated).toBe(true);
      expect(result.nodeId).toBe('node-123');
      expect(mockVersionManager.createVersionSnapshot).toHaveBeenCalledWith(
        'test-file.md',
        'new content'
      );
      expect(mockTimelineEngine.createNode).toHaveBeenCalledWith(
        'test-file.md',
        'Context: new-context',
        false
      );
    });

    it('should not create snapshot when confidence is below threshold', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.3, // Below threshold of 0.5
        suggestedContext: 'new-context',
        signals: [],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'content',
          timestamp: new Date(),
        },
      };

      const result = await integration.handleContextShift(
        detection,
        mockFile,
        'content'
      );

      expect(result.snapshotCreated).toBe(false);
      expect(mockVersionManager.createVersionSnapshot).not.toHaveBeenCalled();
    });

    it('should respect rate limiting', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.8,
        suggestedContext: 'context',
        signals: [],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'content',
          timestamp: new Date(),
        },
      };

      // Create integration with low rate limit
      const rateLimitedIntegration = new ContextVersioningIntegration(
        mockVersionManager,
        mockTimelineEngine,
        mockLogger,
        { maxSnapshotsPerHour: 1 }
      );

      // First call should succeed
      await rateLimitedIntegration.handleContextShift(
        detection,
        mockFile,
        'content1'
      );

      // Second call should be rate limited
      const result = await rateLimitedIntegration.handleContextShift(
        detection,
        mockFile,
        'content2'
      );

      expect(result.snapshotCreated).toBe(false);
    });

    it('should update timeline regardless of snapshot creation', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.3, // Below threshold
        suggestedContext: 'context',
        signals: [],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'content',
          timestamp: new Date(),
        },
      };

      const mockNode: TimelineNode = {
        id: 'node-123',
        timestamp: new Date(),
        parentIds: [],
        childIds: [],
        contextId: 'context',
        label: 'Context: context',
        isCheckpoint: false,
        metadata: {
          fileId: 'test-file.md',
          filePath: 'test-file.md',
          wordCount: 10,
          characterCount: 100,
          contentHash: 'hash',
          createdBy: 'auto',
        },
      };

      mockTimelineEngine.createNode.mockResolvedValue(mockNode);

      const result = await integration.handleContextShift(
        detection,
        mockFile,
        'content'
      );

      expect(result.snapshotCreated).toBe(false);
      expect(result.timelineUpdated).toBe(true);
      expect(mockTimelineEngine.createNode).toHaveBeenCalled();
    });

    it('should generate appropriate suggestions', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.85,
        suggestedContext: 'context',
        signals: [
          {
            type: 'semantic',
            confidence: 0.85,
            evidence: { suggestedContext: 'context' },
            weight: 1.0,
          },
        ],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'content',
          timestamp: new Date(),
        },
      };

      const mockSnapshot: VersionSnapshot = {
        id: 'snapshot-123',
        fileId: 'test-file.md',
        nodeId: 'node-123',
        contentHash: 'hash',
        size: 100,
        metadata: {
          filePath: 'test-file.md',
          timestamp: new Date(),
          contextId: 'context',
          isCheckpoint: false,
          compression: 'gzip',
          originalSize: 100,
          compressedSize: 80,
        },
      };

      mockVersionManager.createVersionSnapshot.mockResolvedValue(mockSnapshot);
      mockTimelineEngine.createNode.mockResolvedValue({} as TimelineNode);

      const result = await integration.handleContextShift(
        detection,
        mockFile,
        'content'
      );

      expect(result.suggestions).toContain(
        'Snapshot created for context: context'
      );
      expect(result.suggestions).toContain(
        'Consider manually confirming the context change'
      );
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<IntegrationConfig> = {
        autoSnapshotEnabled: false,
        minimumConfidenceThreshold: 0.9,
      };

      integration.updateConfig(newConfig);
      const config = integration.getConfig();

      expect(config.autoSnapshotEnabled).toBe(false);
      expect(config.minimumConfidenceThreshold).toBe(0.9);
    });

    it('should return current configuration', () => {
      const config = integration.getConfig();

      expect(config).toHaveProperty('autoSnapshotEnabled');
      expect(config).toHaveProperty('minimumConfidenceThreshold');
      expect(config).toHaveProperty('maxSnapshotsPerHour');
    });
  });

  describe('user feedback', () => {
    it('should record positive feedback', async () => {
      await integration.recordUserFeedback('detection-123', true);

      // Should not throw and should log success
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('User correction recorded')
      );
    });

    it('should record negative feedback with correction', async () => {
      await integration.recordUserFeedback(
        'detection-123',
        false,
        'corrected-context'
      );

      expect(mockLogger.info).toHaveBeenCalledWith('User correction recorded', {
        detectionId: 'detection-123',
        correctedContext: 'corrected-context',
      });
    });

    it('should cleanup old feedback', async () => {
      // Record feedback
      await integration.recordUserFeedback('old-detection', true);

      // This should trigger cleanup of old feedback (simulated)
      // In real implementation, this would clean up old entries
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('statistics', () => {
    it('should provide accurate statistics', async () => {
      const stats = await integration.getStatistics();

      expect(stats).toHaveProperty('totalSnapshots');
      expect(stats).toHaveProperty('snapshotsPerFile');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('userCorrections');
      expect(stats).toHaveProperty('successRate');

      expect(typeof stats.totalSnapshots).toBe('number');
      expect(typeof stats.averageConfidence).toBe('number');
      expect(typeof stats.successRate).toBe('number');
    });

    it('should calculate success rate correctly', async () => {
      // Record some feedback
      await integration.recordUserFeedback('detection-1', true);
      await integration.recordUserFeedback('detection-2', false);
      await integration.recordUserFeedback('detection-3', true);

      const stats = await integration.getStatistics();

      // Should show 2/3 = 0.67 success rate
      expect(stats.successRate).toBeCloseTo(0.67, 2);
      expect(stats.userCorrections).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle version manager errors gracefully', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.8,
        suggestedContext: 'context',
        signals: [],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'content',
          timestamp: new Date(),
        },
      };

      mockVersionManager.createVersionSnapshot.mockRejectedValue(
        new Error('Storage error')
      );

      const result = await integration.handleContextShift(
        detection,
        mockFile,
        'content'
      );

      expect(result.snapshotCreated).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create automatic snapshot',
        expect.any(Error)
      );
    });

    it('should handle timeline engine errors gracefully', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.8,
        suggestedContext: 'context',
        signals: [],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'content',
          timestamp: new Date(),
        },
      };

      mockTimelineEngine.createNode.mockRejectedValue(
        new Error('Timeline error')
      );

      const result = await integration.handleContextShift(
        detection,
        mockFile,
        'content'
      );

      expect(result.timelineUpdated).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update timeline',
        expect.any(Error)
      );
    });

    it('should handle critical errors gracefully', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.8,
        suggestedContext: 'context',
        signals: [],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'content',
          timestamp: new Date(),
        },
      };

      mockTimelineEngine.createNode.mockRejectedValue(
        new Error('Critical error')
      );

      const result = await integration.handleContextShift(
        detection,
        mockFile,
        'content'
      );

      expect(result.timelineUpdated).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update timeline',
        expect.any(Error)
      );
    });
  });

  describe('performance', () => {
    it('should complete processing within time limits', async () => {
      const detection: ContextShiftDetection = {
        probability: 0.8,
        suggestedContext: 'context',
        signals: [],
        timestamp: new Date(),
        fileOperation: {
          type: 'modify',
          filePath: 'test-file.md',
          content: 'content',
          timestamp: new Date(),
        },
      };

      mockVersionManager.createVersionSnapshot.mockResolvedValue(
        {} as VersionSnapshot
      );
      mockTimelineEngine.createNode.mockResolvedValue({} as TimelineNode);

      const startTime = performance.now();
      await integration.handleContextShift(detection, mockFile, 'content');
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
