/**
 * InteractionTracer - Trace agent interactions and decision-making
 *
 * Provides detailed tracing of agent interactions, including:
 * - Memory retrieval
 * - AI responses
 * - Tool executions
 * - Decision-making steps
 * - Performance metrics
 */

import type { Trace, TraceStep, InteractionMetrics } from '../types';

export class InteractionTracer {
  private traces: Map<string, Trace> = new Map();
  private activeTraceId: string | null = null;
  private maxTraces: number;

  constructor(options: { maxTraces?: number } = {}) {
    this.maxTraces = options.maxTraces || 100;
  }

  /**
   * Start tracing a new interaction
   */
  public startInteraction(interactionId: string): void {
    const trace: Trace = {
      id: interactionId,
      steps: [],
      startTime: Date.now()
    };

    this.traces.set(interactionId, trace);
    this.activeTraceId = interactionId;

    // Clean up old traces if we exceed max
    if (this.traces.size > this.maxTraces) {
      const oldestId = this.traces.keys().next().value;
      if (oldestId) {
        this.traces.delete(oldestId);
      }
    }
  }

  /**
   * Log a step in the current interaction
   */
  public log(step: string, data: any): void {
    if (!this.activeTraceId) {
      console.warn('No active trace. Call startInteraction first.');
      return;
    }

    const trace = this.traces.get(this.activeTraceId);
    if (!trace) {
      return;
    }

    const traceStep: TraceStep = {
      step,
      data: this.sanitizeData(data),
      timestamp: Date.now()
    };

    // Calculate duration from previous step
    if (trace.steps.length > 0) {
      const previousStep = trace.steps[trace.steps.length - 1];
      traceStep.duration = traceStep.timestamp - previousStep.timestamp;
    } else {
      traceStep.duration = traceStep.timestamp - trace.startTime;
    }

    trace.steps.push(traceStep);
  }

  /**
   * End the current interaction
   */
  public endInteraction(): Trace | undefined {
    if (!this.activeTraceId) {
      return undefined;
    }

    const trace = this.traces.get(this.activeTraceId);
    if (trace) {
      trace.endTime = Date.now();
      trace.duration = trace.endTime - trace.startTime;
    }

    this.activeTraceId = null;
    return trace;
  }

  /**
   * Get a specific trace by ID
   */
  public getTrace(interactionId: string): Trace | undefined {
    return this.traces.get(interactionId);
  }

  /**
   * Get all traces
   */
  public getAllTraces(): Trace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Export a trace as JSON string
   */
  public export(interactionId: string): string {
    const trace = this.traces.get(interactionId);
    if (!trace) {
      return '';
    }

    return JSON.stringify(trace, null, 2);
  }

  /**
   * Export all traces
   */
  public exportAll(): string {
    const traces = Array.from(this.traces.values());
    return JSON.stringify(traces, null, 2);
  }

  /**
   * Get performance metrics for an interaction
   */
  public getMetrics(interactionId: string): InteractionMetrics | null {
    const trace = this.traces.get(interactionId);
    if (!trace) {
      return null;
    }

    return {
      duration: trace.duration,
      stepCount: trace.steps.length,
      memoryRetrievalTime: this.getStepDuration(trace, 'memory_retrieval'),
      aiResponseTime: this.getStepDuration(trace, 'ai_response'),
      toolExecutionTime: this.getStepDuration(trace, 'tool_execution')
    };
  }

  /**
   * Get aggregate metrics across all traces
   */
  public getAggregateMetrics(): {
    totalInteractions: number;
    averageDuration: number;
    averageSteps: number;
    averageMemoryRetrieval: number;
    averageAIResponse: number;
    averageToolExecution: number;
  } {
    const traces = Array.from(this.traces.values());

    if (traces.length === 0) {
      return {
        totalInteractions: 0,
        averageDuration: 0,
        averageSteps: 0,
        averageMemoryRetrieval: 0,
        averageAIResponse: 0,
        averageToolExecution: 0
      };
    }

    let totalDuration = 0;
    let totalSteps = 0;
    let totalMemoryRetrieval = 0;
    let totalAIResponse = 0;
    let totalToolExecution = 0;

    for (const trace of traces) {
      totalDuration += trace.duration || 0;
      totalSteps += trace.steps.length;
      totalMemoryRetrieval += this.getStepDuration(trace, 'memory_retrieval') || 0;
      totalAIResponse += this.getStepDuration(trace, 'ai_response') || 0;
      totalToolExecution += this.getStepDuration(trace, 'tool_execution') || 0;
    }

    return {
      totalInteractions: traces.length,
      averageDuration: totalDuration / traces.length,
      averageSteps: totalSteps / traces.length,
      averageMemoryRetrieval: totalMemoryRetrieval / traces.length,
      averageAIResponse: totalAIResponse / traces.length,
      averageToolExecution: totalToolExecution / traces.length
    };
  }

  /**
   * Get duration of a specific step
   */
  private getStepDuration(trace: Trace, stepName: string): number {
    const step = trace.steps.find(s => s.step === stepName);
    return step?.duration || 0;
  }

  /**
   * Sanitize trace data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (!data) {
      return data;
    }

    // If it's a primitive, return as-is
    if (typeof data !== 'object') {
      return data;
    }

    // If it's an array, sanitize each element
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    // If it's an object, sanitize recursively
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential', 'authorization'];

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = sensitiveKeys.some(term =>
        key.toLowerCase().includes(term.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Clear all traces
   */
  public clear(): void {
    this.traces.clear();
    this.activeTraceId = null;
  }

  /**
   * Get trace count
   */
  public count(): number {
    return this.traces.size;
  }

  /**
   * Find traces that match a predicate
   */
  public findTraces(predicate: (trace: Trace) => boolean): Trace[] {
    return Array.from(this.traces.values()).filter(predicate);
  }

  /**
   * Get slowest interactions
   */
  public getSlowest(limit: number = 10): Trace[] {
    return Array.from(this.traces.values())
      .filter(t => t.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  /**
   * Get fastest interactions
   */
  public getFastest(limit: number = 10): Trace[] {
    return Array.from(this.traces.values())
      .filter(t => t.duration !== undefined)
      .sort((a, b) => (a.duration || 0) - (b.duration || 0))
      .slice(0, limit);
  }

  /**
   * Get traces with errors
   */
  public getErrorTraces(): Trace[] {
    return this.findTraces(trace =>
      trace.steps.some(step =>
        step.step.toLowerCase().includes('error') ||
        (step.data && step.data.error)
      )
    );
  }

  /**
   * Generate a summary report
   */
  public generateReport(): string {
    const metrics = this.getAggregateMetrics();
    const slowest = this.getSlowest(5);
    const errorCount = this.getErrorTraces().length;

    let report = '# Interaction Tracer Report\n\n';
    report += `## Summary\n`;
    report += `- Total Interactions: ${metrics.totalInteractions}\n`;
    report += `- Average Duration: ${metrics.averageDuration.toFixed(2)}ms\n`;
    report += `- Average Steps: ${metrics.averageSteps.toFixed(2)}\n`;
    report += `- Errors: ${errorCount}\n\n`;

    report += `## Performance Breakdown\n`;
    report += `- Memory Retrieval: ${metrics.averageMemoryRetrieval.toFixed(2)}ms\n`;
    report += `- AI Response: ${metrics.averageAIResponse.toFixed(2)}ms\n`;
    report += `- Tool Execution: ${metrics.averageToolExecution.toFixed(2)}ms\n\n`;

    if (slowest.length > 0) {
      report += `## Slowest Interactions\n`;
      for (let i = 0; i < slowest.length; i++) {
        const trace = slowest[i];
        report += `${i + 1}. ID: ${trace.id}, Duration: ${trace.duration}ms, Steps: ${trace.steps.length}\n`;
      }
    }

    return report;
  }
}
