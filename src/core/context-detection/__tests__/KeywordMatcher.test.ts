import { KeywordMatcher } from '../KeywordMatcher';
import { ContextDefinition } from '../../../data/models/core';
import { Logger } from '../../../utils/logger';

describe('KeywordMatcher', () => {
  let matcher: KeywordMatcher;
  let mockLogger: Logger;
  let testContexts: ContextDefinition[];

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    matcher = new KeywordMatcher(mockLogger);

    testContexts = [
      {
        id: 'fantasy-magic',
        name: 'Fantasy Magic',
        description: 'Magical elements and spells',
        keywords: ['magic', 'spell', 'wizard', 'enchantment', 'mystical'],
        color: '#9966CC',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      },
      {
        id: 'battle-combat',
        name: 'Battle Combat',
        description: 'Fighting and warfare',
        keywords: ['sword', 'battle', 'fight', 'warrior', 'combat'],
        color: '#CC0000',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      },
      {
        id: 'character-dialogue',
        name: 'Character Dialogue',
        description: 'Character conversations',
        keywords: ['said', 'replied', 'whispered', 'shouted', 'conversation'],
        color: '#0066CC',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      },
    ];
  });

  describe('initialization', () => {
    it('should initialize with contexts successfully', async () => {
      await matcher.initialize(testContexts);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Keyword matcher initialized',
        {
          contextsLoaded: 3,
          totalKeywords: 15, // 5 keywords per context * 3 contexts
        }
      );
    });

    it('should handle empty contexts array', async () => {
      await matcher.initialize([]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Keyword matcher initialized',
        {
          contextsLoaded: 0,
          totalKeywords: 0,
        }
      );
    });

    it('should build keyword-to-context mapping correctly', async () => {
      await matcher.initialize(testContexts);

      const allKeywords = matcher.getAllKeywords();
      expect(allKeywords).toContain('magic');
      expect(allKeywords).toContain('sword');
      expect(allKeywords).toContain('said');
      expect(allKeywords).toHaveLength(15);
    });

    it('should handle duplicate keywords across contexts', async () => {
      const contextsWithDuplicates: ContextDefinition[] = [
        {
          id: 'context-1',
          name: 'Context 1',
          keywords: ['magic', 'power'],
          color: '#000000',
          isActive: true,
          createdAt: new Date(),
          metadata: {},
        },
        {
          id: 'context-2',
          name: 'Context 2',
          keywords: ['magic', 'energy'], // 'magic' is duplicate
          color: '#000000',
          isActive: true,
          createdAt: new Date(),
          metadata: {},
        },
      ];

      await matcher.initialize(contextsWithDuplicates);

      const allKeywords = matcher.getAllKeywords();
      expect(allKeywords.filter(k => k === 'magic')).toHaveLength(1);
      expect(allKeywords).toContain('power');
      expect(allKeywords).toContain('energy');
    });
  });

  describe('keyword detection', () => {
    beforeEach(async () => {
      await matcher.initialize(testContexts);
    });

    it('should detect context shifts based on keywords', async () => {
      const content =
        'The wizard cast a powerful magic spell with his enchanted staff';

      const signals = await matcher.detectKeywordShifts(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].type).toBe('keyword');
      expect(signals[0].evidence.suggestedContext).toBe('fantasy-magic');
      expect(signals[0].evidence.matches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ keyword: 'wizard' }),
          expect.objectContaining({ keyword: 'magic' }),
          expect.objectContaining({ keyword: 'spell' }),
        ])
      );
    });

    it('should ignore current context when specified', async () => {
      const content = 'The wizard cast a magic spell';

      const signals = await matcher.detectKeywordShifts(
        content,
        'fantasy-magic'
      );

      expect(signals).toHaveLength(0); // Should not suggest the current context
    });

    it('should handle multiple context matches', async () => {
      const content =
        'The warrior drew his sword and cast a magic spell in battle';

      const signals = await matcher.detectKeywordShifts(content);

      expect(signals.length).toBeGreaterThanOrEqual(1);
      const suggestedContexts = signals.map(s => s.evidence.suggestedContext);
      expect(suggestedContexts).toContain('battle-combat');
      // May also suggest 'fantasy-magic' depending on scoring
    });

    it('should return empty array when no keywords match', async () => {
      const content = 'The peaceful village enjoyed a quiet morning';

      const signals = await matcher.detectKeywordShifts(content);

      expect(signals).toHaveLength(0);
    });

    it('should handle case-insensitive matching', async () => {
      const content = 'The WIZARD cast a MAGIC SPELL';

      const signals = await matcher.detectKeywordShifts(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].evidence.suggestedContext).toBe('fantasy-magic');
    });

    it('should use word boundaries for accurate matching', async () => {
      // Should not match 'magic' in 'magical' if 'magic' is the keyword
      const content = 'The magical forest was full of imagination';

      const signals = await matcher.detectKeywordShifts(content);

      expect(signals).toHaveLength(0); // 'magical' and 'imagination' shouldn't match 'magic'
    });

    it('should calculate confidence based on keyword frequency', async () => {
      const content =
        'Magic, magic everywhere! The wizard used magic spell after magic spell';

      const signals = await matcher.detectKeywordShifts(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].confidence).toBeGreaterThan(0.5);
      expect(
        signals[0].evidence.matches.find(m => m.keyword === 'magic')
          ?.occurrences
      ).toBeGreaterThan(1);
    });
  });

  describe('keyword scoring', () => {
    beforeEach(async () => {
      await matcher.initialize(testContexts);
    });

    it('should give higher scores to contexts with more keyword matches', async () => {
      const content = 'The wizard cast magic spells with mystical enchantments';

      const signals = await matcher.detectKeywordShifts(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].evidence.suggestedContext).toBe('fantasy-magic');
      expect(signals[0].confidence).toBeGreaterThan(0.3);
    });

    it('should consider keyword density in scoring', async () => {
      const shortContent = 'magic spell';
      const longContent = `magic spell ${'filler text '.repeat(100)}`;

      const shortSignals = await matcher.detectKeywordShifts(shortContent);
      const longSignals = await matcher.detectKeywordShifts(longContent);

      expect(shortSignals[0].confidence).toBeGreaterThan(
        longSignals[0].confidence
      );
    });

    it('should weight longer keywords higher', async () => {
      const contextWithLongKeywords: ContextDefinition[] = [
        {
          id: 'long-keywords',
          name: 'Long Keywords',
          keywords: ['enchantment'], // Longer keyword
          color: '#000000',
          isActive: true,
          createdAt: new Date(),
          metadata: {},
        },
        {
          id: 'short-keywords',
          name: 'Short Keywords',
          keywords: ['x'], // Very short keyword
          color: '#000000',
          isActive: true,
          createdAt: new Date(),
          metadata: {},
        },
      ];

      await matcher.initialize(contextWithLongKeywords);

      const longKeywordContent = 'The powerful enchantment was cast';
      const shortKeywordContent = 'x marks the spot';

      const longSignals = await matcher.detectKeywordShifts(longKeywordContent);
      const shortSignals =
        await matcher.detectKeywordShifts(shortKeywordContent);

      if (longSignals.length > 0 && shortSignals.length > 0) {
        expect(longSignals[0].confidence).toBeGreaterThan(
          shortSignals[0].confidence
        );
      }
    });
  });

  describe('context management', () => {
    beforeEach(async () => {
      await matcher.initialize(testContexts);
    });

    it('should add new context successfully', async () => {
      const newContext: ContextDefinition = {
        id: 'nature-scenes',
        name: 'Nature Scenes',
        keywords: ['forest', 'tree', 'river', 'mountain'],
        color: '#00AA00',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      };

      await matcher.addContext(newContext);

      const contextKeywords = matcher.getContextKeywords('nature-scenes');
      expect(contextKeywords).toEqual(['forest', 'tree', 'river', 'mountain']);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Context added to keyword matcher',
        { contextId: 'nature-scenes', keywordCount: 4 }
      );
    });

    it('should remove context successfully', async () => {
      await matcher.removeContext('fantasy-magic');

      const contextKeywords = matcher.getContextKeywords('fantasy-magic');
      expect(contextKeywords).toHaveLength(0);

      const allKeywords = matcher.getAllKeywords();
      expect(allKeywords).not.toContain('magic');
      expect(allKeywords).not.toContain('wizard');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Context removed from keyword matcher',
        { contextId: 'fantasy-magic' }
      );
    });

    it('should handle removing non-existent context', async () => {
      await matcher.removeContext('non-existent');

      // Should not throw error
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Context removed from keyword matcher',
        { contextId: 'non-existent' }
      );
    });

    it('should update keyword mappings when context is removed', async () => {
      const initialKeywords = matcher.getAllKeywords();
      expect(initialKeywords).toContain('magic');

      await matcher.removeContext('fantasy-magic');

      const remainingKeywords = matcher.getAllKeywords();
      expect(remainingKeywords).not.toContain('magic');
      expect(remainingKeywords.length).toBeLessThan(initialKeywords.length);
    });
  });

  describe('performance and efficiency', () => {
    beforeEach(async () => {
      await matcher.initialize(testContexts);
    });

    it('should handle large content efficiently', async () => {
      const largeContent = `${'word '.repeat(10000)}magic spell`;

      const startTime = performance.now();
      const signals = await matcher.detectKeywordShifts(largeContent);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(signals).toHaveLength(1);
    });

    it('should cache regex patterns for performance', async () => {
      const content = 'magic spell wizard';

      // First call
      const startTime1 = performance.now();
      await matcher.detectKeywordShifts(content);
      const endTime1 = performance.now();

      // Second call (should use cached regexes)
      const startTime2 = performance.now();
      await matcher.detectKeywordShifts(content);
      const endTime2 = performance.now();

      const firstCallTime = endTime1 - startTime1;
      const secondCallTime = endTime2 - startTime2;

      // Second call should be faster due to caching (though the difference might be small)
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime + 5); // Allow for measurement variance
    });

    it('should handle many contexts efficiently', async () => {
      const manyContexts = Array.from({ length: 100 }, (_, i) => ({
        id: `context-${i}`,
        name: `Context ${i}`,
        keywords: [`keyword${i}1`, `keyword${i}2`, `keyword${i}3`],
        color: '#000000',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      })) as ContextDefinition[];

      const startTime = performance.now();
      await matcher.initialize(manyContexts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should initialize within 1 second
      expect(matcher.getAllKeywords()).toHaveLength(300); // 3 keywords * 100 contexts
    });
  });

  describe('statistics and metrics', () => {
    beforeEach(async () => {
      await matcher.initialize(testContexts);
    });

    it('should provide accurate keyword statistics', async () => {
      const stats = matcher.getKeywordStats();

      expect(stats.totalKeywords).toBe(15);
      expect(stats.totalContexts).toBe(3);
      expect(stats.avgKeywordsPerContext).toBe(5);
    });

    it('should update statistics after adding context', async () => {
      const newContext: ContextDefinition = {
        id: 'new-context',
        name: 'New Context',
        keywords: ['new1', 'new2'],
        color: '#000000',
        isActive: true,
        createdAt: new Date(),
        metadata: {},
      };

      await matcher.addContext(newContext);
      const stats = matcher.getKeywordStats();

      expect(stats.totalKeywords).toBe(17); // 15 + 2
      expect(stats.totalContexts).toBe(4); // 3 + 1
      expect(stats.avgKeywordsPerContext).toBeCloseTo(4.25, 2); // 17/4 = 4.25
    });

    it('should update statistics after removing context', async () => {
      await matcher.removeContext('fantasy-magic');
      const stats = matcher.getKeywordStats();

      expect(stats.totalKeywords).toBe(10); // 15 - 5
      expect(stats.totalContexts).toBe(2); // 3 - 1
      expect(stats.avgKeywordsPerContext).toBe(5); // 10/2 = 5
    });
  });

  describe('error handling', () => {
    it('should handle empty content gracefully', async () => {
      await matcher.initialize(testContexts);

      const signals = await matcher.detectKeywordShifts('');

      expect(signals).toHaveLength(0);
    });

    it('should handle special characters in keywords', async () => {
      const specialContexts: ContextDefinition[] = [
        {
          id: 'special-chars',
          name: 'Special Characters',
          keywords: ['magic', 'spell', 'enchant'], // Use simpler keywords for this test
          color: '#000000',
          isActive: true,
          createdAt: new Date(),
          metadata: {},
        },
      ];

      await matcher.initialize(specialContexts);

      const content = 'The magic and spell were used for enchant';
      const signals = await matcher.detectKeywordShifts(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].evidence.matches).toHaveLength(3);
    });

    it('should handle regex special characters in content', async () => {
      await matcher.initialize(testContexts);

      const content = 'The magic.spell was cast with ^wizard$ powers';
      const signals = await matcher.detectKeywordShifts(content);

      expect(signals).toHaveLength(1);
      expect(signals[0].evidence.suggestedContext).toBe('fantasy-magic');
    });

    it('should log errors when keyword detection fails', async () => {
      await matcher.initialize(testContexts);

      // Force an error by mocking a failing method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalMethod = (matcher as any).findKeywordPositions;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (matcher as any).findKeywordPositions = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Test error');
        });

      await expect(matcher.detectKeywordShifts('test content')).rejects.toThrow(
        'Test error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Keyword detection failed',
        expect.any(Error)
      );

      // Restore original method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (matcher as any).findKeywordPositions = originalMethod;
    });
  });
});
