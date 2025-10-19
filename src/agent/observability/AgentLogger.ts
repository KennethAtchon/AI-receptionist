/**
 * AgentLogger - Structured logging for agents
 *
 * Provides consistent, structured logging with context
 * for all agent operations and decision-making
 */

import type { LogContext } from '../types';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: Record<string, unknown>;
}

export class AgentLogger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(
    agentId: string,
    agentName: string,
    options: {
      version?: string;
      minLevel?: LogLevel;
    } = {}
  ) {
    this.context = {
      agentId,
      agentName,
      version: options.version || '1.0.0'
    };
    this.minLevel = options.minLevel || 'INFO';
  }

  /**
   * Log an informational message
   */
  public info(message: string, metadata?: Record<string, unknown>): void {
    this.log('INFO', message, metadata);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('WARN', message, metadata);
  }

  /**
   * Log an error message
   */
  public error(message: string, metadata?: Record<string, unknown>): void {
    this.log('ERROR', message, metadata);
  }

  /**
   * Log a debug message
   */
  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('DEBUG', message, metadata);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    // Check if this log level should be output
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      metadata: this.sanitizeMetadata(metadata)
    };

    // Output as structured JSON
    this.output(logEntry);
  }

  /**
   * Determine if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);

    return currentIndex >= minIndex;
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) {
      return undefined;
    }

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential'];

    for (const [key, value] of Object.entries(metadata)) {
      // Check if key contains sensitive terms
      const isSensitive = sensitiveKeys.some(term =>
        key.toLowerCase().includes(term.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeNestedObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize nested objects
   */
  private sanitizeNestedObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeNestedObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential'];

      for (const [key, value] of Object.entries(obj)) {
        const isSensitive = sensitiveKeys.some(term =>
          key.toLowerCase().includes(term.toLowerCase())
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (value && typeof value === 'object') {
          sanitized[key] = this.sanitizeNestedObject(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Output log entry (can be overridden for custom output)
   */
  protected output(logEntry: LogEntry): void {
    // Default: output to console as JSON
    const output = JSON.stringify(logEntry);

    switch (logEntry.level) {
      case 'ERROR':
        console.error(output);
        break;
      case 'WARN':
        console.warn(output);
        break;
      case 'DEBUG':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Update the logging context
   */
  public updateContext(updates: Partial<LogContext>): void {
    this.context = {
      ...this.context,
      ...updates
    };
  }

  /**
   * Set minimum log level
   */
  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get current context
   */
  public getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Create a child logger with additional context
   */
  public child(additionalContext: Partial<LogContext>): AgentLogger {
    const childLogger = new AgentLogger(
      this.context.agentId,
      this.context.agentName,
      { version: this.context.version, minLevel: this.minLevel }
    );

    childLogger.updateContext(additionalContext);
    return childLogger;
  }
}

/**
 * File-based logger that writes to a log file
 */
export class FileLogger extends AgentLogger {
  private logFilePath?: string;

  constructor(
    agentId: string,
    agentName: string,
    options: {
      version?: string;
      minLevel?: LogLevel;
      logFilePath?: string;
    } = {}
  ) {
    super(agentId, agentName, options);
    this.logFilePath = options.logFilePath;
  }

  protected output(logEntry: LogEntry): void {
    // Output to console
    super.output(logEntry);

    // Also write to file if configured
    if (this.logFilePath) {
      // In a real implementation, you would use fs.appendFile
      // For now, this is a placeholder
      // fs.appendFileSync(this.logFilePath, JSON.stringify(logEntry) + '\n');
    }
  }
}
