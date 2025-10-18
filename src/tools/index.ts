/**
 * Tool system exports
 */

export { ToolRegistry } from './registry';
export { ToolBuilder } from './builder';
export { setupStandardTools } from './standard';

/**
 * Tools namespace for creating custom tools
 */
import { ToolBuilder } from './builder';
import { ITool } from '../types';

export const Tools = {
  /**
   * Create a custom tool
   */
  custom(config: {
    name: string;
    description: string;
    parameters: any;
    handler: any;
  }): ITool {
    return new ToolBuilder()
      .withName(config.name)
      .withDescription(config.description)
      .withParameters(config.parameters)
      .default(config.handler)
      .build();
  }
};
