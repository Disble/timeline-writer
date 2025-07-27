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
    if (changeSize > 500) return 1.0; // Large edit
    if (changeSize > 100) return 0.5; // Medium edit
    return 0;
  }
}
