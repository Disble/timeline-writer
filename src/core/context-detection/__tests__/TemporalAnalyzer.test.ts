import { Logger } from '../../../utils/logger';
import { TemporalAnalyzer } from '../TemporalAnalyzer';

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

describe('TemporalAnalyzer', () => {
  let analyzer: TemporalAnalyzer;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;
    analyzer = new TemporalAnalyzer(mockLogger);
  });

  it('should return low confidence for short idle time', () => {
    const signal = analyzer.analyze();

    expect(signal.type).toBe('temporal');
    expect(signal.confidence).toBe(0);
    expect(signal.evidence.idleTime).toBeGreaterThanOrEqual(0);
    expect(signal.weight).toBe(0.5);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/Temporal analysis: idle time \d+\.?\d*s, confidence 0/)
    );
  });

  it('should return medium confidence for medium idle time', () => {
    // Simulate 90 seconds of idle time by manipulating the lastActivity
    const analyzerWithIdle = new TemporalAnalyzer(mockLogger);
    const pastTime = new Date(Date.now() - 90000); // 90 seconds ago
    (analyzerWithIdle as any).lastActivity = pastTime;

    const signal = analyzerWithIdle.analyze();

    expect(signal.type).toBe('temporal');
    expect(signal.confidence).toBe(0.5);
    expect(signal.evidence.idleTime).toBeCloseTo(90, 0);
    expect(signal.weight).toBe(0.5);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/Temporal analysis: idle time \d+\.?\d*s, confidence 0\.5/)
    );
  });

  it('should return high confidence for long idle time', () => {
    // Simulate 6 minutes of idle time
    const analyzerWithIdle = new TemporalAnalyzer(mockLogger);
    const pastTime = new Date(Date.now() - 360000); // 6 minutes ago
    (analyzerWithIdle as any).lastActivity = pastTime;

    const signal = analyzerWithIdle.analyze();

    expect(signal.type).toBe('temporal');
    expect(signal.confidence).toBe(1.0);
    expect(signal.evidence.idleTime).toBeCloseTo(360, 0);
    expect(signal.weight).toBe(0.5);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/Temporal analysis: idle time \d+\.?\d*s, confidence 1/)
    );
  });

  it('should update lastActivity after analysis', () => {
    const initialTime = (analyzer as any).lastActivity.getTime();
    
    // Wait a bit to ensure time difference
    const startTime = Date.now();
    while (Date.now() - startTime < 10) {
      // Small delay
    }
    
    analyzer.analyze();
    const updatedTime = (analyzer as any).lastActivity.getTime();
    
    expect(updatedTime).toBeGreaterThan(initialTime);
  });

  it('should handle multiple consecutive calls', () => {
    const firstSignal = analyzer.analyze();
    expect(firstSignal.evidence.idleTime).toBeGreaterThanOrEqual(0);
    
    // Second call should have very small idle time
    const secondSignal = analyzer.analyze();
    expect(secondSignal.evidence.idleTime).toBeLessThan(1); // Should be very small
    expect(secondSignal.confidence).toBe(0); // Short idle time
  });

  it('should calculate idle time in seconds', () => {
    const analyzerWithIdle = new TemporalAnalyzer(mockLogger);
    const pastTime = new Date(Date.now() - 2000); // 2 seconds ago
    (analyzerWithIdle as any).lastActivity = pastTime;

    const signal = analyzerWithIdle.analyze();
    
    expect(signal.evidence.idleTime).toBeCloseTo(2, 0);
  });
}); 
