import type { ContextDefinition, ContextSignal } from '../../data/models/core';
import type { Logger } from '../../utils/logger';

export interface KeywordMatch {
  keyword: string;
  contextId: string;
  confidence: number;
  occurrences: number;
  positions: number[];
}

export class KeywordMatcher {
  private logger: Logger;
  private contextKeywords: Map<string, Set<string>> = new Map();
  private keywordToContexts: Map<string, Set<string>> = new Map();
  private regexCache: Map<string, RegExp> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(contexts: ContextDefinition[]): Promise<void> {
    try {
      this.contextKeywords.clear();
      this.keywordToContexts.clear();
      this.regexCache.clear();

      contexts.forEach(context => {
        const keywords = new Set(context.keywords.map(k => k.toLowerCase()));
        this.contextKeywords.set(context.id, keywords);

        // Build reverse index
        keywords.forEach(keyword => {
          if (!this.keywordToContexts.has(keyword)) {
            this.keywordToContexts.set(keyword, new Set());
          }
          this.keywordToContexts.get(keyword)?.add(context.id);
        });
      });

      this.logger.info('Keyword matcher initialized', {
        contextsLoaded: contexts.length,
        totalKeywords: this.keywordToContexts.size,
      });
    } catch (error) {
      this.logger.error('Failed to initialize keyword matcher', error);
      throw error;
    }
  }

  async detectKeywordShifts(
    content: string,
    currentContext?: string
  ): Promise<ContextSignal[]> {
    try {
      const matches = this.findKeywordMatches(content);
      const signals: ContextSignal[] = [];

      if (matches.length === 0) {
        return signals;
      }

      // Group matches by context
      const contextMatches = new Map<string, KeywordMatch[]>();
      matches.forEach(match => {
        if (!contextMatches.has(match.contextId)) {
          contextMatches.set(match.contextId, []);
        }
        contextMatches.get(match.contextId)?.push(match);
      });

      // Calculate context scores
      for (const [contextId, matches] of contextMatches) {
        // Skip current context if it's already active
        if (contextId === currentContext) {
          continue;
        }

        const score = this.calculateContextScore(matches, content.length);

        if (score > 0.2) {
          // Minimum threshold for keyword confidence
          signals.push({
            type: 'keyword',
            confidence: Math.min(score, 1.0),
            evidence: {
              suggestedContext: contextId,
              matches: matches.map((m: KeywordMatch) => ({
                keyword: m.keyword,
                occurrences: m.occurrences,
                confidence: m.confidence,
              })),
              totalMatches: matches.length,
              score,
            },
            weight: 1.0,
          });
        }
      }

      this.logger.debug('Keyword detection completed', {
        totalMatches: matches.length,
        signalsGenerated: signals.length,
        contextsWithMatches: contextMatches.size,
      });

      return signals;
    } catch (error) {
      this.logger.error('Keyword detection failed', error);
      throw error;
    }
  }

  private findKeywordMatches(content: string): KeywordMatch[] {
    const matches: KeywordMatch[] = [];
    const contentLower = content.toLowerCase();

    for (const [keyword, contexts] of this.keywordToContexts) {
      const positions = this.findKeywordPositions(contentLower, keyword);

      if (positions.length > 0) {
        const confidence = this.calculateKeywordConfidence(
          keyword,
          positions,
          content.length
        );

        contexts.forEach(contextId => {
          matches.push({
            keyword,
            contextId,
            confidence,
            occurrences: positions.length,
            positions,
          });
        });
      }
    }

    return matches;
  }

  private findKeywordPositions(content: string, keyword: string): number[] {
    const positions: number[] = [];
    let regex = this.regexCache.get(keyword);

    if (!regex) {
      // Create word boundary regex for more accurate matching
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      this.regexCache.set(keyword, regex);
    }

    let match;
    while ((match = regex.exec(content)) !== null) {
      positions.push(match.index);
    }

    return positions;
  }

  private calculateKeywordConfidence(
    keyword: string,
    positions: number[],
    contentLength: number
  ): number {
    // Base confidence from frequency
    const frequency = positions.length;
    const density = frequency / Math.max(contentLength / 100, 1); // Per 100 characters

    // Keyword weight based on length and specificity
    const keywordWeight = Math.min(keyword.length / 10, 1); // Longer keywords are more specific

    // Position weight (keywords at beginning/end might be more significant)
    let positionWeight = 1.0;
    if (positions.length > 0) {
      const avgPosition =
        positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
      const relativePosition = avgPosition / contentLength;

      // Weight keywords at beginning or end higher
      if (relativePosition < 0.2 || relativePosition > 0.8) {
        positionWeight = 1.2;
      }
    }

    const confidence = Math.min(
      (frequency * 0.3 + density * 0.4 + keywordWeight * 0.3) * positionWeight,
      1.0
    );

    return confidence;
  }

  private calculateContextScore(
    matches: KeywordMatch[],
    contentLength: number
  ): number {
    if (matches.length === 0) return 0;

    // Aggregate scores from all keyword matches for this context
    const totalOccurrences = matches.reduce(
      (sum, match) => sum + match.occurrences,
      0
    );
    const avgConfidence =
      matches.reduce((sum, match) => sum + match.confidence, 0) /
      matches.length;
    const uniqueKeywords = new Set(matches.map(m => m.keyword)).size;

    // Diversity bonus for having multiple different keywords
    const diversityBonus = Math.min(uniqueKeywords / 5, 1.0);

    // Density factor
    const density = totalOccurrences / Math.max(contentLength / 100, 1);

    const score =
      avgConfidence * 0.5 + diversityBonus * 0.3 + Math.min(density, 1) * 0.2;

    return Math.min(score, 1.0);
  }

  async addContext(context: ContextDefinition): Promise<void> {
    try {
      const keywords = new Set(context.keywords.map(k => k.toLowerCase()));
      this.contextKeywords.set(context.id, keywords);

      // Update reverse index
      keywords.forEach(keyword => {
        if (!this.keywordToContexts.has(keyword)) {
          this.keywordToContexts.set(keyword, new Set());
        }
        this.keywordToContexts.get(keyword)?.add(context.id);

        // Clear regex cache for this keyword to rebuild it
        this.regexCache.delete(keyword);
      });

      this.logger.debug('Context added to keyword matcher', {
        contextId: context.id,
        keywordCount: keywords.size,
      });
    } catch (error) {
      this.logger.error('Failed to add context to keyword matcher', error);
      throw error;
    }
  }

  async removeContext(contextId: string): Promise<void> {
    try {
      const keywords = this.contextKeywords.get(contextId);
      if (keywords) {
        // Remove from reverse index
        keywords.forEach(keyword => {
          const contexts = this.keywordToContexts.get(keyword);
          if (contexts) {
            contexts.delete(contextId);
            if (contexts.size === 0) {
              this.keywordToContexts.delete(keyword);
              this.regexCache.delete(keyword);
            }
          }
        });

        this.contextKeywords.delete(contextId);
      }

      this.logger.debug('Context removed from keyword matcher', { contextId });
    } catch (error) {
      this.logger.error('Failed to remove context from keyword matcher', error);
      throw error;
    }
  }

  getContextKeywords(contextId: string): string[] {
    const keywords = this.contextKeywords.get(contextId);
    return keywords ? Array.from(keywords) : [];
  }

  getAllKeywords(): string[] {
    return Array.from(this.keywordToContexts.keys());
  }

  getKeywordStats(): {
    totalKeywords: number;
    totalContexts: number;
    avgKeywordsPerContext: number;
  } {
    const totalKeywords = this.keywordToContexts.size;
    const totalContexts = this.contextKeywords.size;
    const avgKeywordsPerContext =
      totalContexts > 0
        ? Array.from(this.contextKeywords.values()).reduce(
            (sum, keywords) => sum + keywords.size,
            0
          ) / totalContexts
        : 0;

    return {
      totalKeywords,
      totalContexts,
      avgKeywordsPerContext: Math.round(avgKeywordsPerContext * 100) / 100,
    };
  }
}
