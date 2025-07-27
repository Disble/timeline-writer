import { TFile } from 'obsidian';
import { SemanticAnalyzer } from './SemanticAnalyzer';
import { KeywordMatcher } from './KeywordMatcher';
import { TemporalAnalyzer } from './TemporalAnalyzer';
import { BehavioralAnalyzer } from './BehavioralAnalyzer';
import {
  ContextShiftDetection,
  ContextSignal,
  FileOperation,
  ContextDefinition,
} from '../../data/models/core';
import { Logger } from '../../utils/logger';

export interface ContextDetectionConfig {
  semanticWeight: number;
  keywordWeight: number;
  temporalWeight: number;
  behavioralWeight: number;
  minimumConfidence: number;
  enableSemanticAnalysis: boolean;
  enableKeywordMatching: boolean;
  enableTemporalAnalysis: boolean;
  enableBehavioralAnalysis: boolean;
}

const DEFAULT_CONFIG: ContextDetectionConfig = {
  semanticWeight: 0.4,
  keywordWeight: 0.3,
  temporalWeight: 0.2,
  behavioralWeight: 0.1,
  minimumConfidence: 0.6,
  enableSemanticAnalysis: true,
  enableKeywordMatching: true,
  enableTemporalAnalysis: true,
  enableBehavioralAnalysis: true,
};

export class ContextDetectionEngine {
  private semanticAnalyzer: SemanticAnalyzer;
  private keywordMatcher: KeywordMatcher;
  private temporalAnalyzer: TemporalAnalyzer;
  private behavioralAnalyzer: BehavioralAnalyzer;
  private logger: Logger;
  private config: ContextDetectionConfig;
  private contexts: Map<string, ContextDefinition> = new Map();

  constructor(logger: Logger, config: Partial<ContextDetectionConfig> = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.semanticAnalyzer = new SemanticAnalyzer(logger);
    this.keywordMatcher = new KeywordMatcher(logger);
    this.temporalAnalyzer = new TemporalAnalyzer(logger);
    this.behavioralAnalyzer = new BehavioralAnalyzer(logger);
  }

  async initialize(contexts: ContextDefinition[]): Promise<void> {
    try {
      // Store contexts for analysis
      this.contexts.clear();
      contexts.forEach(context => {
        this.contexts.set(context.id, context);
      });

      // Initialize analyzers
      await Promise.all([
        this.semanticAnalyzer.initialize(contexts),
        this.keywordMatcher.initialize(contexts),
        this.temporalAnalyzer.initialize(),
        this.behavioralAnalyzer.initialize(),
      ]);

      this.logger.info('Context detection engine initialized', {
        contextsLoaded: contexts.length,
        config: this.config,
      });
    } catch (error) {
      this.logger.error('Failed to initialize context detection engine', error);
      throw error;
    }
  }

  async detectContextShift(
    file: TFile,
    newContent: string,
    previousContent?: string,
    currentContext?: string
  ): Promise<ContextShiftDetection | null> {
    const startTime = performance.now();

    try {
      const fileOperation: FileOperation = {
        type: previousContent ? 'modify' : 'create',
        filePath: file.path,
        content: newContent,
        timestamp: new Date(),
      };

      // Collect signals from all analyzers
      const signals = await this.collectContextSignals(
        fileOperation,
        previousContent,
        currentContext
      );

      if (signals.length === 0) {
        this.logger.debug('No context signals detected', {
          filePath: file.path,
        });
        return null;
      }

      // Calculate weighted confidence score
      const detection = this.calculateContextShift(signals, fileOperation);

      const processingTime = performance.now() - startTime;
      this.logger.debug('Context detection completed', {
        filePath: file.path,
        processingTime: `${processingTime.toFixed(2)}ms`,
        signalsCount: signals.length,
        confidence: detection.probability,
      });

      // Only return detection if confidence meets threshold
      if (detection.probability >= this.config.minimumConfidence) {
        return detection;
      }

      return null;
    } catch (error) {
      this.logger.error('Context detection failed', error);
      throw error;
    }
  }

  private async collectContextSignals(
    fileOperation: FileOperation,
    previousContent?: string,
    currentContext?: string
  ): Promise<ContextSignal[]> {
    const signals: ContextSignal[] = [];

    // Semantic analysis
    if (this.config.enableSemanticAnalysis && previousContent) {
      try {
        const semanticSignals = await this.semanticAnalyzer.analyzeContentShift(
          previousContent,
          fileOperation.content
        );
        signals.push(...semanticSignals);
      } catch (error) {
        this.logger.warn('Semantic analysis failed', error);
      }
    }

    // Keyword matching
    if (this.config.enableKeywordMatching) {
      try {
        const keywordSignals = await this.keywordMatcher.detectKeywordShifts(
          fileOperation.content,
          currentContext
        );
        signals.push(...keywordSignals);
      } catch (error) {
        this.logger.warn('Keyword matching failed', error);
      }
    }

    // Temporal analysis
    if (this.config.enableTemporalAnalysis) {
      try {
        const temporalSignals =
          await this.temporalAnalyzer.analyzeEditingPatterns(fileOperation);
        signals.push(...temporalSignals);
      } catch (error) {
        this.logger.warn('Temporal analysis failed', error);
      }
    }

    // Behavioral analysis
    if (this.config.enableBehavioralAnalysis) {
      try {
        const behavioralSignals =
          await this.behavioralAnalyzer.analyzeBehaviorShift(fileOperation);
        signals.push(...behavioralSignals);
      } catch (error) {
        this.logger.warn('Behavioral analysis failed', error);
      }
    }

    return signals;
  }

  private calculateContextShift(
    signals: ContextSignal[],
    fileOperation: FileOperation
  ): ContextShiftDetection {
    // Group signals by suggested context
    const contextScores = new Map<string, number>();
    const contextSignals = new Map<string, ContextSignal[]>();

    signals.forEach(signal => {
      // Extract suggested context from signal evidence
      const suggestedContext = this.extractSuggestedContext(signal);

      if (suggestedContext) {
        const currentScore = contextScores.get(suggestedContext) || 0;
        const weightedScore =
          signal.confidence * this.getWeightForSignalType(signal.type);

        contextScores.set(suggestedContext, currentScore + weightedScore);

        if (!contextSignals.has(suggestedContext)) {
          contextSignals.set(suggestedContext, []);
        }
        contextSignals.get(suggestedContext)!.push(signal);
      }
    });

    // Find the context with highest score
    let bestContext = '';
    let bestScore = 0;
    let bestSignals: ContextSignal[] = [];

    for (const [contextId, score] of contextScores) {
      if (score > bestScore) {
        bestScore = score;
        bestContext = contextId;
        bestSignals = contextSignals.get(contextId) || [];
      }
    }

    // Normalize score to probability (0-1)
    const maxPossibleScore = Object.values(this.config).reduce(
      (sum, weight) => {
        return typeof weight === 'number' && weight <= 1 ? sum + weight : sum;
      },
      0
    );

    const probability = Math.min(bestScore / maxPossibleScore, 1);

    return {
      probability,
      suggestedContext: bestContext,
      signals: bestSignals,
      timestamp: new Date(),
      fileOperation,
    };
  }

  private extractSuggestedContext(signal: ContextSignal): string | null {
    // Extract context suggestion from signal evidence
    if (signal.evidence && typeof signal.evidence === 'object') {
      const suggestedContext = signal.evidence.suggestedContext;
      const contextId = signal.evidence.contextId;
      return (typeof suggestedContext === 'string' ? suggestedContext : 
              typeof contextId === 'string' ? contextId : null);
    }
    return null;
  }

  private getWeightForSignalType(type: ContextSignal['type']): number {
    switch (type) {
      case 'semantic':
        return this.config.semanticWeight;
      case 'keyword':
        return this.config.keywordWeight;
      case 'temporal':
        return this.config.temporalWeight;
      case 'behavioral':
        return this.config.behavioralWeight;
      default:
        return 0.1;
    }
  }

  updateConfig(newConfig: Partial<ContextDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Context detection config updated', {
      config: this.config,
    });
  }

  async addContext(context: ContextDefinition): Promise<void> {
    this.contexts.set(context.id, context);

    // Update analyzers with new context
    await Promise.all([
      this.semanticAnalyzer.addContext(context),
      this.keywordMatcher.addContext(context),
    ]);

    this.logger.info('Context added to detection engine', {
      contextId: context.id,
    });
  }

  async removeContext(contextId: string): Promise<void> {
    this.contexts.delete(contextId);

    // Update analyzers
    await Promise.all([
      this.semanticAnalyzer.removeContext(contextId),
      this.keywordMatcher.removeContext(contextId),
    ]);

    this.logger.info('Context removed from detection engine', { contextId });
  }

  getActiveContexts(): ContextDefinition[] {
    return Array.from(this.contexts.values()).filter(
      context => context.isActive
    );
  }

  async getPerformanceMetrics(): Promise<{
    averageDetectionTime: number;
    successRate: number;
    signalDistribution: Record<string, number>;
  }> {
    // Implementation would track performance metrics over time
    return {
      averageDetectionTime: 0,
      successRate: 0,
      signalDistribution: {},
    };
  }
}
