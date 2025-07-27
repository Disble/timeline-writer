import { Logger } from '../../../utils/logger';
import { SemanticAnalyzer } from '../SemanticAnalyzer';

// Mock the entire module
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

describe('SemanticAnalyzer', () => {
  let analyzer: SemanticAnalyzer;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // We need to get the mocked instance via the static method
    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;
    analyzer = new SemanticAnalyzer(mockLogger);
  });

  it('should return high similarity for very similar content', () => {
    const oldContent = 'The quick brown fox jumps over the lazy dog.';
    const newContent = 'The quick brown fox leaped over the lazy dog.';
    const signal = analyzer.analyze(newContent, oldContent);
    expect(signal.type).toBe('semantic');
    expect(signal.confidence).toBeCloseTo(0.2, 1);
    expect(signal.evidence.similarity).toBeCloseTo(0.8, 1);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should return low similarity for very different content', () => {
    const oldContent = 'The sun is shining brightly.';
    const newContent = 'The moon is a cold, distant rock.';
    const signal = analyzer.analyze(newContent, oldContent);
    expect(signal.type).toBe('semantic');
    expect(signal.confidence).toBeCloseTo(0.8, 1);
    expect(signal.evidence.similarity).toBeCloseTo(0.2, 1);
    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
