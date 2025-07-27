import { Logger } from '../../../utils/logger';
import { BehavioralAnalyzer } from '../BehavioralAnalyzer';

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

describe('BehavioralAnalyzer', () => {
  let analyzer: BehavioralAnalyzer;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;
    analyzer = new BehavioralAnalyzer(mockLogger);
  });

  it('should return low confidence for small changes', () => {
    const content = 'Small change';
    const signal = analyzer.analyze(content);

    expect(signal.type).toBe('behavioral');
    expect(signal.confidence).toBe(0);
    expect(signal.evidence.changeSize).toBe(content.length);
    expect(signal.weight).toBe(0.75);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Behavioral analysis: change size ${content.length}, confidence 0`
    );
  });

  it('should return medium confidence for medium changes', () => {
    const content = 'A'.repeat(150); // 150 characters
    const signal = analyzer.analyze(content);

    expect(signal.type).toBe('behavioral');
    expect(signal.confidence).toBe(0.5);
    expect(signal.evidence.changeSize).toBe(content.length);
    expect(signal.weight).toBe(0.75);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Behavioral analysis: change size ${content.length}, confidence 0.5`
    );
  });

  it('should return high confidence for large changes', () => {
    const content = 'A'.repeat(600); // 600 characters
    const signal = analyzer.analyze(content);

    expect(signal.type).toBe('behavioral');
    expect(signal.confidence).toBe(1.0);
    expect(signal.evidence.changeSize).toBe(content.length);
    expect(signal.weight).toBe(0.75);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Behavioral analysis: change size ${content.length}, confidence 1`
    );
  });

  it('should track content length changes between calls', () => {
    const firstContent = 'Short content';
    const secondContent = 'Much longer content that should trigger medium confidence';
    
    // First call - initial content
    const firstSignal = analyzer.analyze(firstContent);
    expect(firstSignal.evidence.changeSize).toBe(firstContent.length);
    
    // Second call - should calculate difference
    const secondSignal = analyzer.analyze(secondContent);
    const expectedChangeSize = Math.abs(secondContent.length - firstContent.length);
    expect(secondSignal.evidence.changeSize).toBe(expectedChangeSize);
  });

  it('should handle decreasing content length', () => {
    const longContent = 'A'.repeat(600);
    const shortContent = 'Short';
    
    // First call with long content
    analyzer.analyze(longContent);
    
    // Second call with short content - should detect large decrease
    const signal = analyzer.analyze(shortContent);
    const expectedChangeSize = Math.abs(shortContent.length - longContent.length);
    
    expect(signal.evidence.changeSize).toBe(expectedChangeSize);
    expect(signal.confidence).toBe(1.0); // Large change
  });
}); 
