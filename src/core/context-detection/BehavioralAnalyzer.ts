import type { ContextSignal, FileOperation } from '../../data/models/core';
import type { Logger } from '../../utils/logger';

interface BehaviorPattern {
  averageWordCount: number;
  typicalEditingSizes: number[];
  writingVelocity: number; // words per minute
  editingStyle: 'incremental' | 'burst' | 'mixed';
  pausePatterns: number[];
}

interface WritingMetrics {
  wordsAdded: number;
  wordsDeleted: number;
  charactersAdded: number;
  charactersDeleted: number;
  editSize: number;
  editType: 'small' | 'medium' | 'large' | 'massive';
}

export class BehavioralAnalyzer {
  private logger: Logger;
  private behaviorHistory: WritingMetrics[] = [];
  private patterns: BehaviorPattern;
  private maxHistorySize = 500;

  constructor(logger: Logger) {
    this.logger = logger;
    this.patterns = {
      averageWordCount: 0,
      typicalEditingSizes: [],
      writingVelocity: 0,
      editingStyle: 'mixed',
      pausePatterns: [],
    };
  }

  async initialize(): Promise<void> {
    try {
      this.behaviorHistory = [];
      this.logger.info('Behavioral analyzer initialized');
    } catch (error) {
      this.logger.error('Failed to initialize behavioral analyzer', error);
      throw error;
    }
  }

  async analyzeBehaviorShift(
    operation: FileOperation
  ): Promise<ContextSignal[]> {
    try {
      // Extract writing metrics from the operation
      const metrics = this.extractWritingMetrics(operation);

      // Add to behavior history
      this.addToHistory(metrics);

      // Update behavior patterns
      this.updateBehaviorPatterns();

      // Generate behavioral signals
      const signals = this.generateBehavioralSignals(metrics, operation);

      this.logger.debug('Behavioral analysis completed', {
        filePath: operation.filePath,
        editSize: metrics.editSize,
        editType: metrics.editType,
        signalsGenerated: signals.length,
      });

      return signals;
    } catch (error) {
      this.logger.error('Behavioral analysis failed', error);
      throw error;
    }
  }

  private extractWritingMetrics(operation: FileOperation): WritingMetrics {
    const content = operation.content;
    const wordCount = this.countWords(content);
    const charCount = content.length;

    // For simplicity, we'll estimate metrics from current content
    // In a real implementation, you'd compare with previous version
    const estimatedWordsAdded = Math.max(
      0,
      wordCount - this.patterns.averageWordCount
    );
    const estimatedCharsAdded = Math.max(0, charCount);

    const editSize = estimatedCharsAdded;
    const editType = this.categorizeEditSize(editSize);

    return {
      wordsAdded: estimatedWordsAdded,
      wordsDeleted: 0, // Would need diff calculation
      charactersAdded: estimatedCharsAdded,
      charactersDeleted: 0, // Would need diff calculation
      editSize,
      editType,
    };
  }

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  private categorizeEditSize(
    size: number
  ): 'small' | 'medium' | 'large' | 'massive' {
    if (size < 50) return 'small';
    if (size < 200) return 'medium';
    if (size < 1000) return 'large';
    return 'massive';
  }

  private addToHistory(metrics: WritingMetrics): void {
    this.behaviorHistory.push(metrics);

    if (this.behaviorHistory.length > this.maxHistorySize) {
      this.behaviorHistory = this.behaviorHistory.slice(-this.maxHistorySize);
    }
  }

  private updateBehaviorPatterns(): void {
    if (this.behaviorHistory.length < 5) return;

    // Update average word count
    const totalWords = this.behaviorHistory.reduce(
      (sum, m) => sum + m.wordsAdded,
      0
    );
    this.patterns.averageWordCount = totalWords / this.behaviorHistory.length;

    // Update typical editing sizes
    this.patterns.typicalEditingSizes = this.behaviorHistory
      .slice(-20) // Last 20 edits
      .map(m => m.editSize);

    // Determine editing style
    this.patterns.editingStyle = this.determineEditingStyle();
  }

  private determineEditingStyle(): 'incremental' | 'burst' | 'mixed' {
    if (this.behaviorHistory.length < 10) return 'mixed';

    const recentEdits = this.behaviorHistory.slice(-20);
    const smallEdits = recentEdits.filter(m => m.editType === 'small').length;
    const largeEdits = recentEdits.filter(
      m => m.editType === 'large' || m.editType === 'massive'
    ).length;

    const smallRatio = smallEdits / recentEdits.length;
    const largeRatio = largeEdits / recentEdits.length;

    if (smallRatio > 0.7) return 'incremental';
    if (largeRatio > 0.4) return 'burst';
    return 'mixed';
  }

  private generateBehavioralSignals(
    metrics: WritingMetrics,
    operation: FileOperation
  ): ContextSignal[] {
    const signals: ContextSignal[] = [];

    // Analyze edit size deviation
    const sizeSignal = this.analyzeEditSizeDeviation(metrics);
    if (sizeSignal) {
      signals.push(sizeSignal);
    }

    // Analyze writing style change
    const styleSignal = this.analyzeWritingStyleChange(metrics);
    if (styleSignal) {
      signals.push(styleSignal);
    }

    // Analyze velocity change
    const velocitySignal = this.analyzeVelocityChange(metrics, operation);
    if (velocitySignal) {
      signals.push(velocitySignal);
    }

    return signals;
  }

  private analyzeEditSizeDeviation(
    metrics: WritingMetrics
  ): ContextSignal | null {
    if (this.patterns.typicalEditingSizes.length < 10) return null;

    const avgSize =
      this.patterns.typicalEditingSizes.reduce((sum, size) => sum + size, 0) /
      this.patterns.typicalEditingSizes.length;

    const deviation = Math.abs(metrics.editSize - avgSize);
    const relativeDeviation = avgSize > 0 ? deviation / avgSize : 0;

    // Significant deviation might indicate context change
    if (relativeDeviation > 1.5) {
      return {
        type: 'behavioral',
        confidence: Math.min(relativeDeviation / 3, 1.0),
        evidence: {
          type: 'edit_size_deviation',
          currentEditSize: metrics.editSize,
          averageEditSize: avgSize,
          deviation,
          relativeDeviation,
          editType: metrics.editType,
        },
        weight: 0.6,
      };
    }

    return null;
  }

  private analyzeWritingStyleChange(
    metrics: WritingMetrics
  ): ContextSignal | null {
    if (this.behaviorHistory.length < 15) return null;

    const recentStyle = this.determineEditingStyle();
    const previousBehavior = this.behaviorHistory.slice(-15, -5);
    const previousStyle =
      this.determineEditingStyleFromHistory(previousBehavior);

    if (recentStyle !== previousStyle && recentStyle !== 'mixed') {
      return {
        type: 'behavioral',
        confidence: 0.7,
        evidence: {
          type: 'style_change',
          previousStyle,
          currentStyle: recentStyle,
          currentEditType: metrics.editType,
          suggestion: 'Writing style shift detected',
        },
        weight: 0.7,
      };
    }

    return null;
  }

  private determineEditingStyleFromHistory(
    history: WritingMetrics[]
  ): 'incremental' | 'burst' | 'mixed' {
    if (history.length === 0) return 'mixed';

    const smallEdits = history.filter(m => m.editType === 'small').length;
    const largeEdits = history.filter(
      m => m.editType === 'large' || m.editType === 'massive'
    ).length;

    const smallRatio = smallEdits / history.length;
    const largeRatio = largeEdits / history.length;

    if (smallRatio > 0.7) return 'incremental';
    if (largeRatio > 0.4) return 'burst';
    return 'mixed';
  }

  private analyzeVelocityChange(
    _metrics: WritingMetrics,
    _operation: FileOperation
  ): ContextSignal | null {
    if (this.behaviorHistory.length < 5) return null;

    // Estimate current velocity based on recent operations
    const recentMetrics = this.behaviorHistory.slice(-5);
    const recentWordsPerEdit =
      recentMetrics.reduce((sum, m) => sum + m.wordsAdded, 0) /
      recentMetrics.length;

    // Compare with historical velocity
    const historicalWordsPerEdit = this.patterns.averageWordCount;

    if (historicalWordsPerEdit > 0) {
      const velocityChange =
        Math.abs(recentWordsPerEdit - historicalWordsPerEdit) /
        historicalWordsPerEdit;

      if (velocityChange > 0.5) {
        return {
          type: 'behavioral',
          confidence: Math.min(velocityChange, 1.0),
          evidence: {
            type: 'velocity_change',
            currentVelocity: recentWordsPerEdit,
            historicalVelocity: historicalWordsPerEdit,
            changeRatio: velocityChange,
            recentEdits: recentMetrics.length,
          },
          weight: 0.5,
        };
      }
    }

    return null;
  }

  getBehaviorStatistics(): {
    totalEdits: number;
    averageEditSize: number;
    editingStyle: string;
    averageWordCount: number;
    editTypeDistribution: Record<string, number>;
  } {
    const editTypeDistribution: Record<string, number> = {
      small: 0,
      medium: 0,
      large: 0,
      massive: 0,
    };

    this.behaviorHistory.forEach(metrics => {
      if (
        metrics.editType &&
        editTypeDistribution[metrics.editType] !== undefined
      ) {
        const currentValue = editTypeDistribution[metrics.editType];
        if (currentValue !== undefined) {
          editTypeDistribution[metrics.editType] = currentValue + 1;
        }
      }
    });

    const totalEdits = this.behaviorHistory.length;
    Object.keys(editTypeDistribution).forEach(key => {
      const currentValue = editTypeDistribution[key];
      if (currentValue !== undefined) {
        editTypeDistribution[key] =
          totalEdits > 0 ? currentValue / totalEdits : 0;
      }
    });

    const avgEditSize =
      totalEdits > 0
        ? this.behaviorHistory.reduce((sum, m) => sum + m.editSize, 0) /
          totalEdits
        : 0;

    return {
      totalEdits,
      averageEditSize: Math.round(avgEditSize),
      editingStyle: this.patterns.editingStyle,
      averageWordCount: Math.round(this.patterns.averageWordCount),
      editTypeDistribution,
    };
  }

  updateBehaviorThresholds(thresholds: {
    smallEditThreshold?: number;
    mediumEditThreshold?: number;
    largeEditThreshold?: number;
    deviationSensitivity?: number;
  }): void {
    // Update internal thresholds based on user preferences
    this.logger.debug('Behavior thresholds updated', { thresholds });
  }

  clearHistory(): void {
    this.behaviorHistory = [];
    this.patterns = {
      averageWordCount: 0,
      typicalEditingSizes: [],
      writingVelocity: 0,
      editingStyle: 'mixed',
      pausePatterns: [],
    };
    this.logger.info('Behavioral history cleared');
  }
}
