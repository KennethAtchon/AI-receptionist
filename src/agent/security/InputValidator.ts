/**
 * InputValidator - Simple pattern-based security validation (80/20 approach)
 * Catches most common jailbreak attempts without heavy ML models
 */

export interface SecurityResult {
  isSecure: boolean;
  sanitizedContent: string;
  riskLevel: 'low' | 'medium' | 'high';
  detectedPatterns: string[];
}

export class InputValidator {
  private readonly patterns: Array<{ regex: RegExp; category: string }>;

  constructor() {
    // Common jailbreak patterns (80/20 coverage)
    this.patterns = [
      // Role override attempts
      { regex: /ignore.*previous.*instructions?/i, category: 'role_override' },
      { regex: /you are now/i, category: 'role_override' },
      { regex: /forget.*(?:instructions?|role|system)/i, category: 'role_override' },
      { regex: /new instructions?:/i, category: 'role_override' },
      { regex: /override.*system/i, category: 'role_override' },
      { regex: /disregard.*(?:previous|above|prior)/i, category: 'role_override' },

      // Prompt extraction attempts
      { regex: /(?:show|display|print|output|reveal|tell me).*(?:system prompt|instructions?|rules)/i, category: 'prompt_extraction' },
      { regex: /what (?:are|is) your (?:instructions?|prompt|rules)/i, category: 'prompt_extraction' },
      { regex: /repeat.*(?:instructions?|system prompt)/i, category: 'prompt_extraction' },

      // Character role-play exploits
      { regex: /pretend (?:to be|you are|you're)/i, category: 'roleplay' },
      { regex: /act as (?:if|a|an)/i, category: 'roleplay' },
      { regex: /roleplay/i, category: 'roleplay' },
      { regex: /simulate.*(?:being|that you)/i, category: 'roleplay' },

      // Delimiter confusion attacks
      { regex: /```system/i, category: 'delimiter_confusion' },
      { regex: /\[SYSTEM\]/i, category: 'delimiter_confusion' },
      { regex: /\<\|im_start\|\>/i, category: 'delimiter_confusion' },
      { regex: /\<\|im_end\|\>/i, category: 'delimiter_confusion' },
      { regex: /\[INST\]/i, category: 'delimiter_confusion' },
      { regex: /\[\/INST\]/i, category: 'delimiter_confusion' },

      // DAN-style attempts (Do Anything Now)
      { regex: /Developer Mode/i, category: 'dan_style' },
      { regex: /DAN.*do anything/i, category: 'dan_style' },
      { regex: /jailbreak/i, category: 'dan_style' },
      { regex: /evil mode/i, category: 'dan_style' },

      // Prompt injection via special tokens
      { regex: /<\|endoftext\|\>/i, category: 'special_tokens' },
      { regex: /<\|startoftext\|\>/i, category: 'special_tokens' },
      { regex: /\[ASSISTANT\]/i, category: 'special_tokens' },
      { regex: /\[HUMAN\]/i, category: 'special_tokens' }
    ];
  }

  /**
   * Validate input for security issues
   * @param input User input to validate
   * @returns Security validation result
   */
  validate(input: string): SecurityResult {
    const detectedPatterns: string[] = [];
    const categories = new Set<string>();

    // Check against all patterns
    for (const { regex, category } of this.patterns) {
      if (regex.test(input)) {
        detectedPatterns.push(`${category}: ${regex.source}`);
        categories.add(category);
      }
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (categories.size === 0) {
      riskLevel = 'low';
    } else if (
      categories.has('role_override') ||
      categories.has('prompt_extraction') ||
      categories.has('delimiter_confusion')
    ) {
      riskLevel = 'high';
    } else if (
      categories.has('roleplay') ||
      categories.has('dan_style') ||
      categories.has('special_tokens')
    ) {
      riskLevel = 'medium';
    }

    // Sanitize input: remove known malicious delimiters
    const sanitized = this.sanitizeInput(input);

    return {
      isSecure: detectedPatterns.length === 0,
      sanitizedContent: sanitized,
      riskLevel,
      detectedPatterns
    };
  }

  /**
   * Sanitize input by removing malicious delimiters and tokens
   * @param input Raw user input
   * @returns Sanitized input
   */
  private sanitizeInput(input: string): string {
    let sanitized = input;

    // Remove delimiter confusion attempts
    sanitized = sanitized
      .replace(/```system/gi, '')
      .replace(/\[SYSTEM\]/gi, '')
      .replace(/\<\|im_start\|\>/gi, '')
      .replace(/\<\|im_end\|\>/gi, '')
      .replace(/\[INST\]/gi, '')
      .replace(/\[\/INST\]/gi, '')
      .replace(/\<\|endoftext\|\>/gi, '')
      .replace(/\<\|startoftext\|\>/gi, '')
      .replace(/\[ASSISTANT\]/gi, '')
      .replace(/\[HUMAN\]/gi, '');

    return sanitized.trim();
  }

  /**
   * Generate security response when jailbreak detected
   * @param riskLevel Risk level of detected attempt
   * @returns Safe response to return to user
   */
  getSecurityResponse(riskLevel: 'medium' | 'high'): string {
    if (riskLevel === 'high') {
      return "I'm here to help with legitimate questions. Please rephrase your request.";
    }
    return "I can't help with that. Let me know if you have other questions.";
  }

  /**
   * Check if a specific category of attack was detected
   * @param result Security result from validate()
   * @param category Category to check for
   * @returns True if category was detected
   */
  hasCategory(result: SecurityResult, category: string): boolean {
    return result.detectedPatterns.some(pattern => pattern.startsWith(`${category}:`));
  }
}
