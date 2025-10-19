/**
 * Example: Using AgentLogger and InteractionTracer
 *
 * This example demonstrates how to use the observability components
 * to monitor and debug agent behavior
 */

import { AgentLogger, FileLogger } from '../observability/AgentLogger';
import { InteractionTracer } from '../observability/InteractionTracer';

/**
 * Example 1: Basic logging
 */
export function exampleBasicLogging() {
  console.log('=== Example: Basic Logging ===\n');

  // Create a logger
  const logger = new AgentLogger('agent-001', 'Sarah-Receptionist', {
    version: '1.0.0',
    minLevel: 'DEBUG'
  });

  // Log various messages
  logger.info('Agent initialized successfully');

  logger.debug('Loading configuration', {
    configFile: 'agent-config.json',
    environment: 'production'
  });

  logger.warn('High memory usage detected', {
    memoryUsage: '85%',
    threshold: '80%'
  });

  logger.error('Failed to connect to database', {
    database: 'customer-db',
    error: 'Connection timeout',
    retryAttempt: 1
  });

  console.log('\n✓ Logs generated successfully (check console output above)\n');
}

/**
 * Example 2: Sensitive data sanitization
 */
export function exampleSensitiveDataSanitization() {
  console.log('=== Example: Sensitive Data Sanitization ===\n');

  const logger = new AgentLogger('agent-002', 'Alex-Sales', {
    minLevel: 'INFO'
  });

  // Log with sensitive data - should be automatically redacted
  logger.info('User authentication attempt', {
    username: 'john.doe@example.com',
    password: 'super-secret-password', // Will be redacted
    apiKey: 'sk-1234567890abcdef', // Will be redacted
    userAgent: 'Mozilla/5.0',
    ipAddress: '192.168.1.1'
  });

  console.log('✓ Sensitive data automatically redacted in logs\n');
}

/**
 * Example 3: Child loggers with context
 */
export function exampleChildLoggers() {
  console.log('=== Example: Child Loggers ===\n');

  // Create parent logger
  const parentLogger = new AgentLogger('agent-003', 'MainAgent');

  // Create child loggers with additional context
  const schedulingLogger = parentLogger.child({
    agentName: 'MainAgent-Scheduling',
    module: 'scheduling'
  } as any);

  const billingLogger = parentLogger.child({
    agentName: 'MainAgent-Billing',
    module: 'billing'
  } as any);

  parentLogger.info('Parent logger message');
  schedulingLogger.info('Processing appointment scheduling');
  billingLogger.info('Processing payment');

  console.log('✓ Child loggers created with separate contexts\n');
}

/**
 * Example 4: Interaction tracing
 */
export function exampleInteractionTracing() {
  console.log('=== Example: Interaction Tracing ===\n');

  const tracer = new InteractionTracer({ maxTraces: 100 });

  // Simulate an interaction
  const interactionId = 'INT-001';
  tracer.startInteraction(interactionId);

  // Simulate various steps
  tracer.log('input_received', {
    input: 'I need to schedule an appointment',
    channel: 'call'
  });

  // Simulate some processing time
  setTimeout(() => {}, 50);

  tracer.log('memory_retrieval', {
    shortTermCount: 5,
    longTermCount: 2,
    retrievalTime: 45
  });

  setTimeout(() => {}, 100);

  tracer.log('ai_response', {
    model: 'gpt-4',
    tokens: 150,
    responseTime: 890
  });

  setTimeout(() => {}, 30);

  tracer.log('tool_execution', {
    tool: 'schedule-appointment',
    params: { date: '2025-10-25', time: '14:00' },
    result: { success: true }
  });

  // End the interaction
  const trace = tracer.endInteraction();

  console.log('Trace completed:');
  console.log('- ID:', trace?.id);
  console.log('- Duration:', trace?.duration, 'ms');
  console.log('- Steps:', trace?.steps.length);
  console.log('\nTrace details:');
  trace?.steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step.step} (${step.duration}ms)`);
  });

  // Get metrics
  const metrics = tracer.getMetrics(interactionId);
  console.log('\nMetrics:');
  console.log('- Memory retrieval:', metrics?.memoryRetrievalTime, 'ms');
  console.log('- AI response:', metrics?.aiResponseTime, 'ms');
  console.log('- Tool execution:', metrics?.toolExecutionTime, 'ms');

  console.log('\n✓ Interaction traced successfully\n');
}

/**
 * Example 5: Aggregate metrics and reporting
 */
export function exampleAggregateMetrics() {
  console.log('=== Example: Aggregate Metrics ===\n');

  const tracer = new InteractionTracer();

  // Simulate multiple interactions
  for (let i = 1; i <= 5; i++) {
    const id = `INT-${String(i).padStart(3, '0')}`;
    tracer.startInteraction(id);

    tracer.log('memory_retrieval', { time: Math.random() * 100 });
    tracer.log('ai_response', { time: Math.random() * 1000 });
    tracer.log('tool_execution', { time: Math.random() * 200 });

    tracer.endInteraction();
  }

  // Get aggregate metrics
  const metrics = tracer.getAggregateMetrics();

  console.log('Aggregate Metrics:');
  console.log('- Total interactions:', metrics.totalInteractions);
  console.log('- Average duration:', metrics.averageDuration.toFixed(2), 'ms');
  console.log('- Average steps:', metrics.averageSteps.toFixed(2));
  console.log('- Average memory retrieval:', metrics.averageMemoryRetrieval.toFixed(2), 'ms');
  console.log('- Average AI response:', metrics.averageAIResponse.toFixed(2), 'ms');
  console.log('- Average tool execution:', metrics.averageToolExecution.toFixed(2), 'ms');

  console.log('\n✓ Aggregate metrics calculated\n');
}

/**
 * Example 6: Finding slow interactions
 */
export function exampleFindingSlowInteractions() {
  console.log('=== Example: Finding Slow Interactions ===\n');

  const tracer = new InteractionTracer();

  // Simulate interactions with varying speeds
  for (let i = 1; i <= 10; i++) {
    const id = `INT-${String(i).padStart(3, '0')}`;
    tracer.startInteraction(id);

    // Simulate varying durations
    const steps = Math.floor(Math.random() * 5) + 2;
    for (let j = 0; j < steps; j++) {
      tracer.log(`step_${j}`, { data: 'processing' });
    }

    tracer.endInteraction();
  }

  // Find slowest interactions
  const slowest = tracer.getSlowest(3);

  console.log('Top 3 Slowest Interactions:');
  slowest.forEach((trace, i) => {
    console.log(`${i + 1}. ${trace.id} - ${trace.duration}ms (${trace.steps.length} steps)`);
  });

  // Find fastest interactions
  const fastest = tracer.getFastest(3);

  console.log('\nTop 3 Fastest Interactions:');
  fastest.forEach((trace, i) => {
    console.log(`${i + 1}. ${trace.id} - ${trace.duration}ms (${trace.steps.length} steps)`);
  });

  console.log('\n✓ Performance analysis completed\n');
}

/**
 * Example 7: Generate a comprehensive report
 */
export function exampleGenerateReport() {
  console.log('=== Example: Generate Report ===\n');

  const tracer = new InteractionTracer();

  // Simulate some interactions
  for (let i = 1; i <= 20; i++) {
    const id = `INT-${String(i).padStart(3, '0')}`;
    tracer.startInteraction(id);

    tracer.log('memory_retrieval', { time: Math.random() * 100 });
    tracer.log('ai_response', { time: Math.random() * 1000 });

    // Simulate some errors
    if (i % 7 === 0) {
      tracer.log('error', { message: 'Simulated error' });
    }

    tracer.log('tool_execution', { time: Math.random() * 200 });
    tracer.endInteraction();
  }

  // Generate report
  const report = tracer.generateReport();

  console.log(report);
  console.log('\n✓ Report generated successfully\n');
}

/**
 * Example 8: Exporting traces for debugging
 */
export function exampleExportingTraces() {
  console.log('=== Example: Exporting Traces ===\n');

  const tracer = new InteractionTracer();

  // Create a sample interaction
  tracer.startInteraction('DEBUG-001');
  tracer.log('step1', { action: 'parsing input' });
  tracer.log('step2', { action: 'retrieving context' });
  tracer.log('step3', { action: 'generating response' });
  tracer.endInteraction();

  // Export as JSON
  const json = tracer.export('DEBUG-001');

  console.log('Exported trace (JSON):');
  console.log(json);

  console.log('\n✓ Trace exported successfully\n');
}

/**
 * Run all observability examples
 */
export function runObservabilityExamples() {
  console.log('='.repeat(80));
  console.log('OBSERVABILITY EXAMPLES');
  console.log('='.repeat(80));
  console.log('\n');

  exampleBasicLogging();
  exampleSensitiveDataSanitization();
  exampleChildLoggers();
  exampleInteractionTracing();
  exampleAggregateMetrics();
  exampleFindingSlowInteractions();
  exampleGenerateReport();
  exampleExportingTraces();

  console.log('='.repeat(80));
  console.log('Observability examples completed successfully!');
  console.log('='.repeat(80));
  console.log('\n');
}

// If running this file directly
if (require.main === module) {
  runObservabilityExamples();
}
