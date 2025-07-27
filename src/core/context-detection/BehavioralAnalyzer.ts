import type { ContextSignal } from '../../data/models/core';
import type { Logger } from '../../utils/logger';

export class BehavioralAnalyzer {
  private logger: Logger;
  private lastContentLength = 0;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  analyze(content: string): ContextSignal {
    const changeSize = Math.abs(content.length - this.lastContentLength);
    this.lastContentLength = content.length;

    const confidence = this.calculateConfidence(changeSize);
    this.logger.debug(
      `Behavioral analysis: change size ${changeSize}, confidence ${confidence}`
    );

    return {
      type: 'behavioral',
      confidence,
      evidence: {
        changeSize,
      },
      weight: 0.75,
    };
  }

  private calculateConfidence(changeSize: number): number {
    if (changeSize > 300) return 1.0; // Large edit - reduced from 500
    if (changeSize > 50) return 0.7; // Medium edit - increased confidence and reduced threshold
    if (changeSize > 20) return 0.3; // Small edit - added threshold for minor changes
    return 0;
  }
}
