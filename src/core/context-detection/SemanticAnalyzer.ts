import type { ContextSignal } from '../../data/models/core';
import type { Logger } from '../../utils/logger';

export class SemanticAnalyzer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  analyze(newContent: string, oldContent: string): ContextSignal {
    const similarity = this.calculateSimilarity(newContent, oldContent);
    this.logger.debug(`Semantic similarity: ${similarity}`);

    // For fiction writing, even small changes can be significant
    // Adjust confidence to be more sensitive to changes
    const confidence = Math.max(0, (1 - similarity) * 1.5); // Boost sensitivity

    return {
      type: 'semantic',
      confidence: Math.min(confidence, 1.0), // Cap at 1.0
      evidence: {
        similarity,
      },
      weight: 1.0,
    };
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Placeholder for a real similarity calculation
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) {
      return 1;
    }

    return intersection.size / union.size;
  }
}
