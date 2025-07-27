import type { ContextSignal } from '../../data/models/core';
import type { Logger } from '../../utils/logger';

export class TemporalAnalyzer {
  private logger: Logger;
  private lastActivity: Date = new Date();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  analyze(): ContextSignal {
    const now = new Date();
    const idleTime = (now.getTime() - this.lastActivity.getTime()) / 1000; // in seconds
    this.lastActivity = now;

    const confidence = this.calculateConfidence(idleTime);
    this.logger.debug(
      `Temporal analysis: idle time ${idleTime}s, confidence ${confidence}`
    );

    return {
      type: 'temporal',
      confidence,
      evidence: {
        idleTime,
      },
      weight: 0.5,
    };
  }

  private calculateConfidence(idleTime: number): number {
    if (idleTime > 300) return 1.0; // 5 minutes break is a strong signal
    if (idleTime > 60) return 0.5; // 1 minute break is a medium signal
    return 0;
  }
}
