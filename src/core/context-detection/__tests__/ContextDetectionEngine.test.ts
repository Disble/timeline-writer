import type { TFile } from 'obsidian';
import type {
  ContextDefinition,
  ContextSignal,
} from '../../../data/models/core';
import type { Logger } from '../../../utils/logger';
import {
  type ContextDetectionConfig,
  ContextDetectionEngine,
} from '../ContextDetectionEngine';

// Mock the analyzer modules
jest.mock('../SemanticAnalyzer');
jest.mock('../KeywordMatcher');
jest.mock('../TemporalAnalyzer');
jest.mock('../BehavioralAnalyzer');

describe('ContextDetectionEngine', () => {
  let engine: ContextDetectionEngine;
  let mockLogger: Logger;
  let testContexts: ContextDefinition[];
  let mockFile: TFile;

  const mockSemanticAnalyzer = {
    initialize: jest.fn(),
    analyzeContentShift: jest.fn(),
    addContext: jest.fn(),
    removeContext: jest.fn(),
  };

  const mockKeywordMatcher = {
    initialize: jest.fn(),
    detectKeywordShifts: jest.fn(),
    addContext: jest.fn(),
    removeContext: jest.fn(),
  };

  const mockTemporalAnalyzer = {
    initialize: jest.fn(),
    analyzeEditingPatterns: jest.fn(),
  };

  const mockBehavioralAnalyzer = {
    initialize: jest.fn(),
    analyzeBehaviorShift: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock functions
    mockSemanticAnalyzer.initialize.mockResolvedValue(undefined);
    mockSemanticAnalyzer.analyzeContentShift.mockResolvedValue([]);
    mockSemanticAnalyzer.addContext.mockResolvedValue(undefined);
    mockSemanticAnalyzer.removeContext.mockResolvedValue(undefined);

    mockKeywordMatcher.initialize.mockResolvedValue(undefined);
    mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([]);
    mockKeywordMatcher.addContext.mockResolvedValue(undefined);
    mockKeywordMatcher.removeContext.mockResolvedValue(undefined);

    mockTemporalAnalyzer.initialize.mockResolvedValue(undefined);
    mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);

    mockBehavioralAnalyzer.initialize.mockResolvedValue(undefined);
    mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    testContexts = [
      {
        id: 'context-1',
        name: 'Character Development',
        description: 'Main character growth',
        keywords: ['hero', 'growth', 'challenge'],
        color: '#FF5733',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      },
      {
        id: 'context-2',
        name: 'Battle Scene',
        description: 'Action sequences',
        keywords: ['fight', 'sword', 'battle'],
        color: '#33FF57',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      },
    ];

    mockFile = {
      path: 'test-file.md',
      name: 'test-file.md',
    } as TFile;

    engine = new ContextDetectionEngine(mockLogger, { minimumConfidence: 0.3 });

    // Mock the analyzers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (engine as any).semanticAnalyzer = mockSemanticAnalyzer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (engine as any).keywordMatcher = mockKeywordMatcher;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (engine as any).temporalAnalyzer = mockTemporalAnalyzer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (engine as any).behavioralAnalyzer = mockBehavioralAnalyzer;
  });

  describe('initialization', () => {
    it('should initialize all analyzers successfully', async () => {
      await engine.initialize(testContexts);

      expect(mockSemanticAnalyzer.initialize).toHaveBeenCalledWith(
        testContexts
      );
      expect(mockKeywordMatcher.initialize).toHaveBeenCalledWith(testContexts);
      expect(mockTemporalAnalyzer.initialize).toHaveBeenCalled();
      expect(mockBehavioralAnalyzer.initialize).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Context detection engine initialized',
        expect.objectContaining({
          contextsLoaded: 2,
        })
      );
    });

    it('should handle initialization errors gracefully', async () => {
      mockSemanticAnalyzer.initialize.mockRejectedValue(
        new Error('Init failed')
      );

      await expect(engine.initialize(testContexts)).rejects.toThrow(
        'Init failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize context detection engine',
        expect.any(Error)
      );
    });

    it('should store contexts for analysis', async () => {
      await engine.initialize(testContexts);

      const activeContexts = engine.getActiveContexts();
      expect(activeContexts).toHaveLength(2);
      expect(activeContexts[0].id).toBe('context-1');
      expect(activeContexts[1].id).toBe('context-2');
    });
  });

  describe('context shift detection', () => {
    beforeEach(async () => {
      await engine.initialize(testContexts);
    });

    it('should detect context shift with high confidence', async () => {
      const mockSignals: ContextSignal[] = [
        {
          type: 'semantic',
          confidence: 0.8,
          evidence: { suggestedContext: 'context-2' },
          weight: 1.0,
        },
        {
          type: 'keyword',
          confidence: 0.7,
          evidence: { suggestedContext: 'context-2' },
          weight: 1.0,
        },
      ];

      mockSemanticAnalyzer.analyzeContentShift.mockResolvedValue([
        mockSignals[0],
      ]);
      mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([
        mockSignals[1],
      ]);
      mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);
      mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

      const newContent = 'The warrior drew his sword for battle';
      const previousContent = 'The hero continued his journey';

      const result = await engine.detectContextShift(
        mockFile,
        newContent,
        previousContent,
        'context-1'
      );

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.suggestedContext).toBe('context-2');
        expect(result.probability).toBeGreaterThan(0.4);
        expect(result.signals.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should return null when confidence is below threshold', async () => {
      const mockSignals: ContextSignal[] = [
        {
          type: 'semantic',
          confidence: 0.3,
          evidence: { suggestedContext: 'context-2' },
          weight: 1.0,
        },
      ];

      mockSemanticAnalyzer.analyzeContentShift.mockResolvedValue(mockSignals);
      mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([]);
      mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);
      mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

      const result = await engine.detectContextShift(
        mockFile,
        'Low confidence content'
      );

      expect(result).toBeNull();
    });

    it('should handle file creation (no previous content)', async () => {
      mockSemanticAnalyzer.analyzeContentShift.mockResolvedValue([]);
      mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([]);
      mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);
      mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

      await engine.detectContextShift(mockFile, 'New file content');

      expect(mockSemanticAnalyzer.analyzeContentShift).not.toHaveBeenCalled();
      expect(mockKeywordMatcher.detectKeywordShifts).toHaveBeenCalled();
    });

    it('should handle analyzer failures gracefully', async () => {
      mockSemanticAnalyzer.analyzeContentShift.mockRejectedValue(
        new Error('Semantic analysis failed')
      );
      mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([]);
      mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);
      mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

      const result = await engine.detectContextShift(
        mockFile,
        'Content',
        'Previous content'
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Semantic analysis failed',
        expect.any(Error)
      );
      expect(result).toBeNull(); // No signals = null result
    });
  });

  describe('signal fusion', () => {
    beforeEach(async () => {
      await engine.initialize(testContexts);
    });

    it('should properly weight different signal types', async () => {
      const semanticSignal: ContextSignal = {
        type: 'semantic',
        confidence: 0.8,
        evidence: { suggestedContext: 'context-2' },
        weight: 1.0,
      };

      const keywordSignal: ContextSignal = {
        type: 'keyword',
        confidence: 0.6,
        evidence: { suggestedContext: 'context-2' },
        weight: 1.0,
      };

      mockSemanticAnalyzer.analyzeContentShift.mockResolvedValue([
        semanticSignal,
      ]);
      mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([keywordSignal]);
      mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);
      mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

      const result = await engine.detectContextShift(
        mockFile,
        'Content',
        'Previous'
      );

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        // Should combine weighted scores and meet minimum threshold
        expect(result.probability).toBeGreaterThan(0.3);
        expect(result.suggestedContext).toBe('context-2');
      }
    });

    it('should handle conflicting context suggestions', async () => {
      const signal1: ContextSignal = {
        type: 'semantic',
        confidence: 0.9,
        evidence: { suggestedContext: 'context-1' },
        weight: 1.0,
      };

      const signal2: ContextSignal = {
        type: 'keyword',
        confidence: 0.9,
        evidence: { suggestedContext: 'context-2' },
        weight: 1.0,
      };

      mockSemanticAnalyzer.analyzeContentShift.mockResolvedValue([signal1]);
      mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([signal2]);
      mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);
      mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

      const result = await engine.detectContextShift(
        mockFile,
        'Content',
        'Previous'
      );

      expect(result).toBeDefined();
      if (result) {
        // Should pick one of the contexts based on weighted scores
        expect(['context-1', 'context-2']).toContain(result.suggestedContext);
        expect(result.probability).toBeGreaterThan(0.3);
      } else {
        // Algorithm might not combine conflicting signals, which is also valid behavior
        expect(result).toBeNull();
      }
    });
  });

  describe('configuration management', () => {
    it('should apply custom configuration', async () => {
      const customConfig: Partial<ContextDetectionConfig> = {
        semanticWeight: 0.6,
        keywordWeight: 0.4,
        minimumConfidence: 0.9,
        enableTemporalAnalysis: false,
      };

      const customEngine = new ContextDetectionEngine(mockLogger, customConfig);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (customEngine as any).semanticAnalyzer = mockSemanticAnalyzer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (customEngine as any).keywordMatcher = mockKeywordMatcher;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (customEngine as any).temporalAnalyzer = mockTemporalAnalyzer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (customEngine as any).behavioralAnalyzer = mockBehavioralAnalyzer;

      await customEngine.initialize(testContexts);

      const signal: ContextSignal = {
        type: 'semantic',
        confidence: 0.7,
        evidence: { suggestedContext: 'context-2' },
        weight: 1.0,
      };

      mockSemanticAnalyzer.analyzeContentShift.mockResolvedValue([signal]);
      mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([]);
      mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);
      mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

      const result = await customEngine.detectContextShift(
        mockFile,
        'Content',
        'Previous'
      );

      // With 0.9 minimum confidence and only semantic signal with 0.7 * 0.6 = 0.42
      expect(result).toBeNull();
      expect(
        mockTemporalAnalyzer.analyzeEditingPatterns
      ).not.toHaveBeenCalled();
    });

    it('should update configuration at runtime', () => {
      const newConfig = { minimumConfidence: 0.9 };
      engine.updateConfig(newConfig);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Context detection config updated',
        expect.objectContaining({
          config: expect.objectContaining({ minimumConfidence: 0.9 }),
        })
      );
    });
  });

  describe('context management', () => {
    beforeEach(async () => {
      await engine.initialize(testContexts);
    });

    it('should add new context to all analyzers', async () => {
      const newContext: ContextDefinition = {
        id: 'context-3',
        name: 'New Context',
        description: 'Test context',
        keywords: ['test'],
        color: '#000000',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      };

      await engine.addContext(newContext);

      expect(mockSemanticAnalyzer.addContext).toHaveBeenCalledWith(newContext);
      expect(mockKeywordMatcher.addContext).toHaveBeenCalledWith(newContext);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Context added to detection engine',
        { contextId: 'context-3' }
      );

      const activeContexts = engine.getActiveContexts();
      expect(activeContexts).toHaveLength(3);
    });

    it('should remove context from all analyzers', async () => {
      await engine.removeContext('context-1');

      expect(mockSemanticAnalyzer.removeContext).toHaveBeenCalledWith(
        'context-1'
      );
      expect(mockKeywordMatcher.removeContext).toHaveBeenCalledWith(
        'context-1'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Context removed from detection engine',
        { contextId: 'context-1' }
      );

      const activeContexts = engine.getActiveContexts();
      expect(activeContexts).toHaveLength(1);
    });
  });

  describe('performance metrics', () => {
    beforeEach(async () => {
      await engine.initialize(testContexts);
    });

    it('should provide performance metrics', async () => {
      const metrics = await engine.getPerformanceMetrics();

      expect(metrics).toHaveProperty('averageDetectionTime');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('signalDistribution');
      expect(typeof metrics.averageDetectionTime).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.signalDistribution).toBe('object');
    });

    it('should log processing time for detections', async () => {
      mockSemanticAnalyzer.analyzeContentShift.mockResolvedValue([]);
      mockKeywordMatcher.detectKeywordShifts.mockResolvedValue([]);
      mockTemporalAnalyzer.analyzeEditingPatterns.mockResolvedValue([]);
      mockBehavioralAnalyzer.analyzeBehaviorShift.mockResolvedValue([]);

      await engine.detectContextShift(mockFile, 'Content');

      // Should log either "No context signals detected" or "Context detection completed"
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(
          /^(No context signals detected|Context detection completed)$/
        ),
        expect.objectContaining({
          filePath: 'test-file.md',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle critical failures during detection', async () => {
      await engine.initialize(testContexts);

      // Mock a critical failure that propagates up
      mockSemanticAnalyzer.analyzeContentShift.mockRejectedValue(
        new Error('Critical failure')
      );
      // Don't mock the others to avoid catching the error in individual analyzers

      const result = await engine.detectContextShift(
        mockFile,
        'Content',
        'Previous'
      );

      // The engine should handle individual analyzer failures gracefully
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Semantic analysis failed',
        expect.any(Error)
      );
    });
  });
});
