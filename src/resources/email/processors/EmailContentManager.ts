/**
 * Email Content Manager
 * Manages email content generation modes and HTML templates
 */

import { logger } from '../../../utils/logger';

export type EmailContentMode = 'text' | 'html' | 'template';

/**
 * Manages email content modes and HTML templates
 * Supports three modes:
 * - text: AI generates plain text only (safest, default)
 * - html: AI generates HTML directly (riskier)
 * - template: AI uses predefined templates (recommended for professional emails)
 */
export class EmailContentManager {
  private contentMode: EmailContentMode = 'text';
  private htmlTemplates = new Map<string, string>();

  /**
   * Set the email content mode
   *
   * @param mode - Content generation mode
   */
  setContentMode(mode: EmailContentMode): void {
    this.contentMode = mode;
    logger.info(`[EmailContentManager] Content mode set to: ${mode}`);
  }

  /**
   * Get the current email content mode
   */
  getContentMode(): EmailContentMode {
    return this.contentMode;
  }

  /**
   * Add an HTML template for use in 'template' mode
   * Templates use {{variableName}} syntax for variable substitution
   *
   * @param name - Unique name for the template
   * @param template - HTML template string with {{variables}}
   *
   * @example
   * manager.addHtmlTemplate('order-update', `
   *   <html><body style="font-family: Arial;">
   *     <div style="background: #4A90E2; padding: 20px;">
   *       <h2>{{title}}</h2>
   *     </div>
   *     <div style="padding: 20px;">{{mainContent}}</div>
   *   </body></html>
   * `);
   */
  addHtmlTemplate(name: string, template: string): void {
    this.htmlTemplates.set(name, template);
    logger.info(`[EmailContentManager] Added HTML template: ${name}`);
  }

  /**
   * Remove an HTML template
   */
  removeHtmlTemplate(name: string): void {
    const existed = this.htmlTemplates.delete(name);
    if (existed) {
      logger.info(`[EmailContentManager] Removed HTML template: ${name}`);
    } else {
      logger.warn(`[EmailContentManager] Attempted to remove non-existent template: ${name}`);
    }
  }

  /**
   * Get all available template names
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.htmlTemplates.keys());
  }

  /**
   * Check if a template exists
   */
  hasTemplate(name: string): boolean {
    return this.htmlTemplates.has(name);
  }

  /**
   * Apply template variable substitution
   * Replaces {{variableName}} with values from vars object
   *
   * @param templateName - Name of the template to use
   * @param vars - Variables to substitute in template
   * @returns HTML string with variables substituted
   */
  applyTemplate(templateName: string, vars: Record<string, string>): string {
    const template = this.htmlTemplates.get(templateName);
    if (!template) {
      throw new Error(
        `Template '${templateName}' not found. Available templates: ${this.getAvailableTemplates().join(', ') || 'none'}`
      );
    }

    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(placeholder, value);
    }

    // Check for unresolved placeholders
    const unresolvedMatches = result.match(/\{\{[^}]+\}\}/g);
    if (unresolvedMatches) {
      logger.warn(`[EmailContentManager] Template '${templateName}' has unresolved placeholders`, {
        unresolved: unresolvedMatches
      });
    }

    return result;
  }

  /**
   * Get email content instructions for the system prompt based on current mode
   * These instructions are injected into the AI prompt to guide content generation
   */
  getEmailContentInstructions(): string {
    switch (this.contentMode) {
      case 'text':
        return `
IMPORTANT: Email Content Mode = TEXT
- You MUST ONLY generate plain text email content in the 'body' parameter
- DO NOT use the 'html' parameter - it will be ignored
- DO NOT use the 'template' or 'templateVars' parameters
- Keep emails professional and well-formatted using plain text only
`;

      case 'html':
        return `
IMPORTANT: Email Content Mode = HTML
- You CAN generate HTML markup directly in the 'html' parameter
- You MUST ALWAYS provide a plain text fallback in the 'body' parameter
- Use inline CSS styles (no external stylesheets)
- Keep HTML simple and email-client compatible
- Example:
  send_email({
    to: "user@example.com",
    subject: "Your Order",
    body: "Plain text fallback here",
    html: "<html><body style='font-family: Arial;'><h2>Your Order</h2><p>Content here</p></body></html>"
  })
`;

      case 'template':
        const availableTemplates = this.getAvailableTemplates();
        const templateList = availableTemplates.length > 0
          ? availableTemplates.map(t => `  - "${t}"`).join('\n')
          : '  (No templates available - consumer must add templates first)';

        return `
IMPORTANT: Email Content Mode = TEMPLATE
- You MUST use predefined HTML templates via the 'template' and 'templateVars' parameters
- DO NOT use the 'html' parameter directly
- You MUST provide a plain text version in the 'body' parameter
- Available templates:
${templateList}

- Example usage:
  send_email({
    to: "user@example.com",
    subject: "Order Update",
    body: "Plain text: Your order has shipped!",
    template: "order-update",
    templateVars: {
      title: "Order Shipped!",
      mainContent: "<p>Your order #12345 has been shipped.</p>"
    }
  })
`;

      default:
        return '';
    }
  }

  /**
   * Get statistics about templates
   */
  getStats(): {
    mode: EmailContentMode;
    templateCount: number;
    templateNames: string[];
  } {
    return {
      mode: this.contentMode,
      templateCount: this.htmlTemplates.size,
      templateNames: this.getAvailableTemplates()
    };
  }
}
