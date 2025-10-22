/**
 * Base Processor
 * Simple interface for administrative processors.
 * No AI consultation - just provider operations for services.
 */

export interface IProcessor {
  readonly name: string;
  readonly type: 'call' | 'calendar' | 'messaging' | 'custom';
}

/**
 * Base processor class
 * All processors should extend this class
 */
export abstract class BaseProcessor implements IProcessor {
  abstract readonly name: string;
  abstract readonly type: 'call' | 'calendar' | 'messaging' | 'custom';
}