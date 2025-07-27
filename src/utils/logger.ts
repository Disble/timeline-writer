import { LogLevel, Logger as ILogger } from '../data/models/core';

export class Logger implements ILogger {
  private static instance: Logger;
  private logLevel: LogLevel = 'warn';
  private enableDebug = false;

  private constructor() {
    // no-code
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setDebugMode(enabled: boolean): void {
    this.enableDebug = enabled;
  }

  debug(message: string, context?: unknown): void {
    if (this.shouldLog('debug')) {
      this.log('DEBUG', message, context);
    }
  }

  info(message: string, context?: unknown): void {
    if (this.shouldLog('info')) {
      this.log('INFO', message, context);
    }
  }

  warn(message: string, context?: unknown): void {
    if (this.shouldLog('warn')) {
      this.log('WARN', message, context);
    }
  }

  error(message: string, context?: unknown): void {
    if (this.shouldLog('error')) {
      this.log('ERROR', message, context);
    }
  }

  critical(message: string, context?: unknown): void {
    this.log('CRITICAL', message, context);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private log(level: string, message: string, context?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [Timeline Writer] [${level}] ${message}`;

    if (context) {
      console.log(logMessage, context);
    } else {
      console.log(logMessage);
    }

    // In debug mode, also show in Obsidian's developer console
    if (this.enableDebug) {
      if (level === 'ERROR' || level === 'CRITICAL') {
        console.error(logMessage, context);
      } else if (level === 'WARN') {
        console.warn(logMessage, context);
      } else {
        console.info(logMessage, context);
      }
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
