import type { ContextSignal, FileOperation } from '../../data/models/core';
import type { Logger } from '../../utils/logger';

interface EditingSession {
  startTime: Date;
  endTime: Date;
  operations: FileOperation[];
  duration: number;
  intensity: number;
}

interface EditingPattern {
  averageSessionDuration: number;
  typicalEditingTimes: number[]; // Hours of day
  burstEditingThreshold: number;
  pauseBetweenSessions: number;
}

export class TemporalAnalyzer {
  private logger: Logger;
  private editHistory: FileOperation[] = [];
  private sessions: EditingSession[] = [];
  private patterns: EditingPattern;
  private maxHistorySize = 1000;

  constructor(logger: Logger) {
    this.logger = logger;
    this.patterns = {
      averageSessionDuration: 30 * 60 * 1000, // 30 minutes default
      typicalEditingTimes: [],
      burstEditingThreshold: 5, // operations per minute
      pauseBetweenSessions: 15 * 60 * 1000, // 15 minutes
    };
  }

  async initialize(): Promise<void> {
    try {
      this.editHistory = [];
      this.sessions = [];
      this.logger.info('Temporal analyzer initialized');
    } catch (error) {
      this.logger.error('Failed to initialize temporal analyzer', error);
      throw error;
    }
  }

  async analyzeEditingPatterns(
    operation: FileOperation
  ): Promise<ContextSignal[]> {
    try {
      // Add operation to history
      this.addOperationToHistory(operation);

      // Update sessions
      this.updateEditingSessions(operation);

      // Analyze patterns and generate signals
      const signals = this.generateTemporalSignals(operation);

      this.logger.debug('Temporal analysis completed', {
        filePath: operation.filePath,
        signalsGenerated: signals.length,
        historySize: this.editHistory.length,
      });

      return signals;
    } catch (error) {
      this.logger.error('Temporal analysis failed', error);
      throw error;
    }
  }

  private addOperationToHistory(operation: FileOperation): void {
    this.editHistory.push(operation);

    // Maintain history size limit
    if (this.editHistory.length > this.maxHistorySize) {
      this.editHistory = this.editHistory.slice(-this.maxHistorySize);
    }
  }

  private updateEditingSessions(operation: FileOperation): void {
    const now = operation.timestamp;
    const lastSession = this.sessions[this.sessions.length - 1];

    if (!lastSession || this.isNewSession(now, lastSession.endTime)) {
      // Start new session
      this.sessions.push({
        startTime: now,
        endTime: now,
        operations: [operation],
        duration: 0,
        intensity: 0,
      });
    } else {
      // Continue existing session
      lastSession.endTime = now;
      lastSession.operations.push(operation);
      lastSession.duration = now.getTime() - lastSession.startTime.getTime();
      lastSession.intensity = this.calculateSessionIntensity(lastSession);
    }

    // Maintain sessions limit
    if (this.sessions.length > 100) {
      this.sessions = this.sessions.slice(-100);
    }
  }

  private isNewSession(currentTime: Date, lastSessionEnd: Date): boolean {
    const timeDiff = currentTime.getTime() - lastSessionEnd.getTime();
    return timeDiff > this.patterns.pauseBetweenSessions;
  }

  private calculateSessionIntensity(session: EditingSession): number {
    if (session.duration === 0) return 0;

    const operationsPerMinute =
      (session.operations.length / session.duration) * 60 * 1000;
    return operationsPerMinute;
  }

  private generateTemporalSignals(operation: FileOperation): ContextSignal[] {
    const signals: ContextSignal[] = [];
    // const now = operation.timestamp; // TODO: Use timestamp for temporal analysis

    // Analyze recent editing intensity
    const intensitySignal = this.analyzeEditingIntensity(operation);
    if (intensitySignal) {
      signals.push(intensitySignal);
    }

    // Analyze time-of-day patterns
    const timeSignal = this.analyzeTimePatterns(operation);
    if (timeSignal) {
      signals.push(timeSignal);
    }

    // Analyze session boundaries
    const sessionSignal = this.analyzeSessionBoundaries(operation);
    if (sessionSignal) {
      signals.push(sessionSignal);
    }

    // Analyze editing bursts
    const burstSignal = this.analyzeEditingBursts(operation);
    if (burstSignal) {
      signals.push(burstSignal);
    }

    return signals;
  }

  private analyzeEditingIntensity(
    _operation: FileOperation
  ): ContextSignal | null {
    const currentSession = this.sessions[this.sessions.length - 1];
    if (!currentSession || currentSession.operations.length < 3) {
      return null;
    }

    const intensity = currentSession.intensity;
    const avgIntensity = this.calculateAverageIntensity();

    // Significant change in intensity might indicate context shift
    if (Math.abs(intensity - avgIntensity) > avgIntensity * 0.5) {
      const confidence = Math.min(
        Math.abs(intensity - avgIntensity) / avgIntensity,
        1.0
      );

      return {
        type: 'temporal',
        confidence,
        evidence: {
          type: 'intensity_change',
          currentIntensity: intensity,
          averageIntensity: avgIntensity,
          sessionDuration: currentSession.duration,
          operationsCount: currentSession.operations.length,
        },
        weight: 0.7,
      };
    }

    return null;
  }

  private analyzeTimePatterns(operation: FileOperation): ContextSignal | null {
    const hour = operation.timestamp.getHours();

    // Update typical editing times
    this.patterns.typicalEditingTimes.push(hour);
    if (this.patterns.typicalEditingTimes.length > 100) {
      this.patterns.typicalEditingTimes =
        this.patterns.typicalEditingTimes.slice(-100);
    }

    // Check if current time is unusual
    if (this.patterns.typicalEditingTimes.length > 20) {
      const typicalHours = this.getTypicalEditingHours();
      const isUnusualTime = !typicalHours.includes(hour);

      if (isUnusualTime) {
        return {
          type: 'temporal',
          confidence: 0.6,
          evidence: {
            type: 'unusual_time',
            currentHour: hour,
            typicalHours,
            suggestion: 'Time-based context shift',
          },
          weight: 0.5,
        };
      }
    }

    return null;
  }

  private analyzeSessionBoundaries(
    _operation: FileOperation
  ): ContextSignal | null {
    const sessions = this.sessions;
    if (sessions.length < 2) return null;

    const currentSession = sessions[sessions.length - 1];
    const previousSession = sessions[sessions.length - 2];

    // Check if this is the start of a new session after a significant break
    if (currentSession && currentSession.operations.length === 1) {
      const breakDuration =
        currentSession.startTime.getTime() -
        (previousSession?.endTime.getTime() || 0);
      const avgBreakDuration = this.calculateAverageBreakDuration();

      if (breakDuration > avgBreakDuration * 2) {
        return {
          type: 'temporal',
          confidence: 0.8,
          evidence: {
            type: 'session_boundary',
            breakDuration,
            averageBreakDuration: avgBreakDuration,
            previousSessionIntensity: previousSession?.intensity || 0,
            suggestion: 'New writing session started',
          },
          weight: 0.8,
        };
      }
    }

    return null;
  }

  private analyzeEditingBursts(operation: FileOperation): ContextSignal | null {
    // Look at recent operations (last 5 minutes)
    const fiveMinutesAgo = new Date(
      operation.timestamp.getTime() - 5 * 60 * 1000
    );
    const recentOps = this.editHistory.filter(
      op => op.timestamp >= fiveMinutesAgo
    );

    if (recentOps.length >= this.patterns.burstEditingThreshold) {
      const burstIntensity = recentOps.length / 5; // operations per minute

      return {
        type: 'temporal',
        confidence: Math.min(burstIntensity / 10, 1.0),
        evidence: {
          type: 'editing_burst',
          intensity: burstIntensity,
          operationsInBurst: recentOps.length,
          timeWindow: '5 minutes',
          suggestion: 'Intensive editing session',
        },
        weight: 0.6,
      };
    }

    return null;
  }

  private calculateAverageIntensity(): number {
    if (this.sessions.length === 0) return 0;

    const totalIntensity = this.sessions.reduce(
      (sum, session) => sum + session.intensity,
      0
    );
    return totalIntensity / this.sessions.length;
  }

  private getTypicalEditingHours(): number[] {
    const hourCounts = new Map<number, number>();

    this.patterns.typicalEditingTimes.forEach(hour => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // Return hours that appear more than 10% of the time
    const threshold = this.patterns.typicalEditingTimes.length * 0.1;
    return Array.from(hourCounts.entries())
      .filter(([_, count]) => count > threshold)
      .map(([hour, _]) => hour);
  }

  private calculateAverageBreakDuration(): number {
    if (this.sessions.length < 2) return this.patterns.pauseBetweenSessions;

    let totalBreakTime = 0;
    let breakCount = 0;

    for (let i = 1; i < this.sessions.length; i++) {
      const currentSession = this.sessions[i];
      const previousSession = this.sessions[i - 1];
      if (currentSession && previousSession) {
        const breakTime =
          currentSession.startTime.getTime() -
          previousSession.endTime.getTime();
        totalBreakTime += breakTime;
        breakCount++;
      }
    }

    return breakCount > 0
      ? totalBreakTime / breakCount
      : this.patterns.pauseBetweenSessions;
  }

  getEditingStatistics(): {
    totalOperations: number;
    totalSessions: number;
    averageSessionDuration: number;
    averageIntensity: number;
    typicalEditingHours: number[];
  } {
    return {
      totalOperations: this.editHistory.length,
      totalSessions: this.sessions.length,
      averageSessionDuration: this.patterns.averageSessionDuration,
      averageIntensity: this.calculateAverageIntensity(),
      typicalEditingHours: this.getTypicalEditingHours(),
    };
  }

  updatePatterns(newPatterns: Partial<EditingPattern>): void {
    this.patterns = { ...this.patterns, ...newPatterns };
    this.logger.debug('Temporal patterns updated', { patterns: this.patterns });
  }
}
