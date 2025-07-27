import type { ContextDefinition, ContextSignal } from '../../data/models/core';
import type { Logger } from '../../utils/logger';

export class KeywordMatcher {
  private logger: Logger;
  private contexts: ContextDefinition[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  updateContexts(contexts: ContextDefinition[]): void {
    this.contexts = contexts;
    this.logger.debug('Keyword matcher contexts updated', {
      count: contexts.length,
    });
  }

  analyze(content: string): ContextSignal {
    const matches = this.findMatches(content);
    const confidence = this.calculateConfidence(matches);

    return {
      type: 'keyword',
      confidence,
      evidence: {
        matches: matches.map(m => ({
          keyword: m.keyword,
          occurrences: m.occurrences,
          confidence: m.confidence,
        })),
      },
      weight: 1.5, // Keywords are a strong signal
    };
  }

  private findMatches(content: string): Array<{
    keyword: string;
    contextId: string;
    occurrences: number;
    confidence: number;
  }> {
    const foundMatches: Array<{
      keyword: string;
      contextId: string;
      occurrences: number;
      confidence: number;
    }> = [];
    const lowerCaseContent = content.toLowerCase();

    for (const context of this.contexts) {
      for (const keyword of context.keywords) {
        const occurrences = (
          lowerCaseContent.match(new RegExp(keyword.toLowerCase(), 'g')) || []
        ).length;
        if (occurrences > 0) {
          foundMatches.push({
            keyword,
            contextId: context.id,
            occurrences,
            confidence: Math.min(occurrences / 5, 1), // Simple confidence
          });
        }
      }
    }
    return foundMatches;
  }

  private calculateConfidence(
    matches: Array<{
      keyword: string;
      contextId: string;
      occurrences: number;
      confidence: number;
    }>
  ): number {
    if (matches.length === 0) {
      return 0;
    }
    const totalConfidence = matches.reduce((sum, m) => sum + m.confidence, 0);
    return Math.min(totalConfidence / 5, 1); // Normalize
  }
}
