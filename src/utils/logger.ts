/**
 * Centralized logging utility for the AI Receptionist SDK
 * Provides structured logging with different log levels and contextual information
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LoggerContext {
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, context?: LoggerContext): void;
  info(message: string, context?: LoggerContext): void;
  warn(message: string, context?: LoggerContext): void;
  error(message: string, error?: Error, context?: LoggerContext): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  level?: LogLevel;
  enableTimestamps?: boolean;
  enableColors?: boolean;
  prefix?: string;
}

/**
 * Default logger implementation
 * Follows SDK design principles with structured logging
 */
export class Logger implements ILogger {
  private _level: LogLevel;
  private _enableTimestamps: boolean;
  private _enableColors: boolean;
  private _prefix: string;

  constructor(config: LoggerConfig = {}) {
    this._level = config.level ?? this.getDefaultLogLevel();
    this._enableTimestamps = config.enableTimestamps ?? true;
    this._enableColors = config.enableColors ?? true;
    this._prefix = config.prefix ?? '[AIReceptionist]';
  }

  private getDefaultLogLevel(): LogLevel {
    const envLevel = process.env.AI_RECEPTIONIST_LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'NONE':
        return LogLevel.NONE;
      default:
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  setLevel(level: LogLevel): void {
    this._level = level;
  }

  getLevel(): LogLevel {
    return this._level;
  }

  debug(message: string, context?: LoggerContext): void {
    if (this._level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, context);
    }
  }

  info(message: string, context?: LoggerContext): void {
    if (this._level <= LogLevel.INFO) {
      this.log('INFO', message, context);
    }
  }

  warn(message: string, context?: LoggerContext): void {
    if (this._level <= LogLevel.WARN) {
      this.log('WARN', message, context);
    }
  }

  error(message: string, error?: Error, context?: LoggerContext): void {
    if (this._level <= LogLevel.ERROR) {
      const errorContext = {
        ...context,
        ...(error && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }),
      };
      this.log('ERROR', message, errorContext);
    }
  }

  private log(level: string, message: string, context?: LoggerContext): void {
    const timestamp = this._enableTimestamps ? new Date().toISOString() : '';
    const color = this._enableColors ? this.getColor(level) : '';
    const reset = this._enableColors ? '\x1b[0m' : '';

    const parts = [
      timestamp && `[${timestamp}]`,
      this._prefix,
      `${color}${level}${reset}`,
      message,
    ].filter(Boolean);

    const logMessage = parts.join(' ');

    if (context && Object.keys(context).length > 0) {
      console.log(logMessage, context);
    } else {
      console.log(logMessage);
    }
  }

  private getColor(level: string): string {
    switch (level) {
      case 'DEBUG':
        return '\x1b[36m'; // Cyan
      case 'INFO':
        return '\x1b[32m'; // Green
      case 'WARN':
        return '\x1b[33m'; // Yellow
      case 'ERROR':
        return '\x1b[31m'; // Red
      default:
        return '';
    }
  }
}

/**
 * Global logger instance
 * Can be configured via environment variables or programmatically
 */
let globalLogger: ILogger = new Logger();

/**
 * Get the global logger instance
 */
export function getLogger(): ILogger {
  return globalLogger;
}

/**
 * Configure the global logger
 */
export function configureLogger(config: LoggerConfig): void {
  globalLogger = new Logger(config);
}

/**
 * Create a child logger with a custom prefix
 */
export function createLogger(prefix: string, config?: Omit<LoggerConfig, 'prefix'>): ILogger {
  return new Logger({ ...config, prefix });
}

/**
 * Convenience export for backward compatibility
 */
export const logger = {
  debug: (message: string, context?: LoggerContext) => globalLogger.debug(message, context),
  info: (message: string, context?: LoggerContext) => globalLogger.info(message, context),
  warn: (message: string, context?: LoggerContext) => globalLogger.warn(message, context),
  error: (message: string, error?: Error, context?: LoggerContext) =>
    globalLogger.error(message, error, context),
};
