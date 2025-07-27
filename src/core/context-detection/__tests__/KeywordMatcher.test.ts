import type { ContextDefinition } from '../../../data/models/core';
import { Logger } from '../../../utils/logger';
import { KeywordMatcher } from '../KeywordMatcher';

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

const testContexts: ContextDefinition[] = [
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

describe('KeywordMatcher', () => {
  let matcher: KeywordMatcher;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = Logger.getInstance() as jest.Mocked<Logger>;
    matcher = new KeywordMatcher(mockLogger);
    matcher.updateContexts(testContexts);
  });

  it('should detect keywords and return a signal', () => {
    const content = 'The hero faced a great challenge in the battle.';
    const signal = matcher.analyze(content);
    expect(signal.type).toBe('keyword');
    expect(signal.confidence).toBeGreaterThan(0);
    expect(signal.evidence.matches).toHaveLength(3);
  });
});
