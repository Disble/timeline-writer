import type {
  ContextDefinition,
  ContextShiftDetection,
  ContextSignal,
} from '../../data/models/core';
import type { Logger } from '../../utils/logger';
import { BehavioralAnalyzer } from './BehavioralAnalyzer';
import { KeywordMatcher } from './KeywordMatcher';
import { SemanticAnalyzer } from './SemanticAnalyzer';
import { TemporalAnalyzer } from './TemporalAnalyzer';

export class ContextDetectionEngine {
  private logger: Logger;
  private semanticAnalyzer!: SemanticAnalyzer;
  private keywordMatcher!: KeywordMatcher;
  private temporalAnalyzer!: TemporalAnalyzer;
  private behavioralAnalyzer!: BehavioralAnalyzer;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  initialize(contexts: ContextDefinition[]): void {
    this.semanticAnalyzer = new SemanticAnalyzer(this.logger);
    this.keywordMatcher = new KeywordMatcher(this.logger);
    this.temporalAnalyzer = new TemporalAnalyzer(this.logger);
    this.behavioralAnalyzer = new BehavioralAnalyzer(this.logger);

    this.updateContexts(contexts);
  }

  updateContexts(contexts: ContextDefinition[]): void {
    this.keywordMatcher.updateContexts(contexts);
  }

  async analyze(
    newContent: string,
    oldContent: string
  ): Promise<ContextShiftDetection> {
    const semanticSignal = this.semanticAnalyzer.analyze(
      newContent,
      oldContent
    );
    const keywordSignal = this.keywordMatcher.analyze(newContent);
    const temporalSignal = this.temporalAnalyzer.analyze();
    const behavioralSignal = this.behavioralAnalyzer.analyze(newContent);

    const signals = [
      semanticSignal,
      keywordSignal,
      temporalSignal,
      behavioralSignal,
    ];
    const weightedProbability = this.fuseSignals(signals);

    return {
      probability: weightedProbability,
      suggestedContext: 'default', // Placeholder
      signals,
      timestamp: new Date(),
      fileOperation: {
        type: 'modify',
        filePath: '',
        content: newContent,
        timestamp: new Date(),
      },
    };
  }

  private fuseSignals(signals: ContextSignal[]): number {
    if (signals.length === 0) {
      return 0;
    }
    const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
    if (totalWeight === 0) {
      return 0;
    }
    return (
      signals.reduce(
        (sum, signal) => sum + signal.confidence * signal.weight,
        0
      ) / totalWeight
    );
  }
}
