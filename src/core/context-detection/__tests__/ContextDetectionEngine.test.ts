import type { ContextSignal } from '../../../data/models/core';
import { Logger } from '../../../utils/logger';
import { BehavioralAnalyzer } from '../BehavioralAnalyzer';
import { ContextDetectionEngine } from '../ContextDetectionEngine';
import { KeywordMatcher } from '../KeywordMatcher';
import { SemanticAnalyzer } from '../SemanticAnalyzer';
import { TemporalAnalyzer } from '../TemporalAnalyzer';

jest.mock('../../../utils/logger');
jest.mock('../SemanticAnalyzer');
jest.mock('../KeywordMatcher');
jest.mock('../TemporalAnalyzer');
jest.mock('../BehavioralAnalyzer');

const mockSignal = (type: ContextSignal['type']): ContextSignal => ({
  type,
  confidence: 0.5,
  evidence: {},
  weight: 1.0,
});

describe('ContextDetectionEngine', () => {
  let engine: ContextDetectionEngine;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    (SemanticAnalyzer.prototype.analyze as jest.Mock).mockReturnValue(
      mockSignal('semantic')
    );
    (KeywordMatcher.prototype.analyze as jest.Mock).mockReturnValue(
      mockSignal('keyword')
    );
    (TemporalAnalyzer.prototype.analyze as jest.Mock).mockReturnValue(
      mockSignal('temporal')
    );
    (BehavioralAnalyzer.prototype.analyze as jest.Mock).mockReturnValue(
      mockSignal('behavioral')
    );

    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;
    engine = new ContextDetectionEngine(mockLogger);
    engine.initialize([]);
  });

  it('should analyze content and fuse signals', async () => {
    const newContent = 'The hero fights a dragon.';
    const oldContent = 'The hero starts his journey.';
    const result = await engine.analyze(newContent, oldContent);

    expect(result.probability).toBe(0.5);
    expect(result.signals).toHaveLength(4);
    expect(SemanticAnalyzer.prototype.analyze).toHaveBeenCalledWith(
      newContent,
      oldContent
    );
    expect(KeywordMatcher.prototype.analyze).toHaveBeenCalledWith(newContent);
    expect(TemporalAnalyzer.prototype.analyze).toHaveBeenCalled();
    expect(BehavioralAnalyzer.prototype.analyze).toHaveBeenCalledWith(
      newContent
    );
  });
});
