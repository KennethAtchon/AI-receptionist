/**
 * Email Content Parser
 * Utilities for parsing AI-generated email content
 */

/**
 * Parse AI-generated email content to extract subject and body
 */
export class EmailContentParser {
  /**
   * Parse AI-generated email (extract subject and body)
   * This is a simple implementation - could be enhanced
   *
   * @param content - AI-generated content
   * @returns Object with subject, body, and optional html
   */
  static parseGeneratedEmail(content: string): { subject: string; body: string; html?: string } {
    const lines = content.split('\n');
    const subjectLine = lines.find(l => l.startsWith('Subject:'));
    const subject = subjectLine ? subjectLine.replace('Subject:', '').trim() : 'No Subject';
    const body = lines.filter(l => !l.startsWith('Subject:')).join('\n').trim();

    return { subject, body };
  }
}
