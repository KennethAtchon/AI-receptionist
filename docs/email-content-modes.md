# AI Email Content Generation Modes

**Problem:** Consumers need control over whether the AI generates plain text, HTML, or uses templates for email content.

**Solution:** Three distinct content generation modes with clear consumer control.

---

## The Three Modes

### 1. **TEXT Mode** (Default - Safest)
AI generates plain text content only.

**What AI does:**
- Writes message in the `body` field as plain text
- Does NOT use `html` parameter
- Simple, readable, best deliverability

**Consumer code:**
```typescript
const client = new AIReceptionist({ /* ... */ });
await client.initialize();
// Default mode - no configuration needed
```

**AI tool call:**
```typescript
send_email({
  to: "customer@example.com",
  subject: "Re: Your inquiry",
  body: "Hi John,\n\nThank you for your email. Your order #12345 has been shipped and should arrive in 3-5 business days.\n\nBest regards,\nSarah"
})
```

---

### 2. **HTML Mode** - AI Writes HTML Markup
AI generates HTML directly in the `html` field.

**What AI does:**
- Writes HTML markup with inline styles
- Must still provide `body` as plain text fallback
- AI has freedom to create structure and styling

**Consumer code:**
```typescript
client.email.setContentMode('html');
```

**AI tool call:**
```typescript
send_email({
  to: "customer@example.com",
  subject: "Re: Your inquiry",
  body: "Hi John,\n\nThank you for your email. Your order #12345 has been shipped...",
  html: `
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f5f5f5; padding: 20px;">
        <h2 style="color: #333;">Order Shipped!</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hi John,</p>
        <p>Thank you for your email. Your order <strong>#12345</strong> has been shipped and should arrive in 3-5 business days.</p>
      </div>
      <div style="background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>Best regards,<br>Sarah</p>
      </div>
    </body>
    </html>
  `
})
```

**Risks:**
- AI might generate invalid HTML
- AI might create ugly or inconsistent styling
- Harder to maintain brand consistency

---

### 3. **TEMPLATE Mode** - AI Fills Predefined Templates (Recommended for HTML)
Consumer provides HTML templates, AI fills in content.

**What AI does:**
- Selects appropriate template
- Fills in `{{variables}}` with content
- Enhances content to be professional and engaging
- Consumer controls structure, AI provides content

**Consumer code:**
```typescript
client.email.setContentMode('template');

// Add templates
client.email.addHtmlTemplate('order-update', `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #4A90E2; color: white; padding: 20px;">
    <h2>{{title}}</h2>
  </div>
  <div style="padding: 20px; background: white;">
    {{mainContent}}
  </div>
  <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
    {{footer}}
  </div>
</body>
</html>
`);

client.email.addHtmlTemplate('simple', `
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <p>{{greeting}}</p>
  {{content}}
  <p>{{closing}}</p>
</body>
</html>
`);
```

**AI tool call:**
```typescript
send_email({
  to: "customer@example.com",
  subject: "Re: Your inquiry",
  template: "order-update",
  templateVars: {
    title: "Your Order Has Shipped!",
    mainContent: `
      <p>Hi John,</p>
      <p>Great news! Your order <strong>#12345</strong> has been shipped and is on its way to you.</p>
      <p>Expected delivery: <strong>3-5 business days</strong></p>
      <p>You can track your shipment using this link: <a href="https://track.example.com/12345">Track Order</a></p>
    `,
    footer: "Thank you for shopping with us!<br>- Sarah, Customer Service"
  }
})
```

**Benefits:**
- Consumer controls brand/structure
- AI focuses on content quality
- Consistent professional appearance
- Easier to maintain
- Safer than free-form HTML

---

## Mode Comparison Table

| Mode | AI Writes | Consumer Provides | Safety | Deliverability | Use Case |
|------|-----------|-------------------|--------|----------------|----------|
| `text` | Plain text | Nothing | ✅ Highest | ✅ Best | Default, simple emails, maximum compatibility |
| `html` | Full HTML markup | Nothing | ⚠️ Medium | ⚠️ Good | Advanced use, trust AI to write valid HTML |
| `template` | Content variables | HTML structure | ✅ High | ✅ Good | Professional branded emails, best of both worlds |

---

## Implementation Design

### EmailResource API

```typescript
type EmailContentMode = 'text' | 'html' | 'template';

class EmailResource {
  private contentMode: EmailContentMode = 'text';  // Default
  private htmlTemplates = new Map<string, string>();

  /**
   * Set email content generation mode
   */
  public setContentMode(mode: EmailContentMode): void {
    this.contentMode = mode;
    logger.info(`[EmailResource] Content mode set to: ${mode}`);
  }

  /**
   * Add HTML template (for template mode)
   */
  public addHtmlTemplate(name: string, template: string): void {
    this.htmlTemplates.set(name, template);
    logger.info(`[EmailResource] Added template: ${name}`);
  }

  /**
   * Get current content mode
   */
  public getContentMode(): EmailContentMode {
    return this.contentMode;
  }

  /**
   * Apply template with variables
   */
  private applyTemplate(templateName: string, vars: Record<string, string>): string {
    const template = this.htmlTemplates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    let html = template;
    for (const [key, value] of Object.entries(vars)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return html;
  }

  /**
   * Get system prompt instructions for current mode
   */
  private getEmailContentInstructions(): string {
    switch (this.contentMode) {
      case 'text':
        return `
When using send_email:
- Write plain text only in the 'body' field
- Do NOT use 'html', 'template', or 'templateVars' parameters
- Keep it simple and readable
`;

      case 'html':
        return `
When using send_email:
- Write HTML in the 'html' field (with inline styles)
- ALWAYS provide plain text version in 'body' field
- Use professional, clean HTML
- Inline styles only (no external CSS)
- Mobile-friendly formatting
`;

      case 'template':
        const templateNames = Array.from(this.htmlTemplates.keys());
        return `
When using send_email:
- Use 'template' parameter: ${templateNames.join(', ')}
- Fill 'templateVars' with appropriate content
- Enhance content to be professional and engaging
- The template controls structure, you provide content

Available templates: ${templateNames.join(', ')}
`;
    }
  }
}
```

### send_email Tool Updates

```typescript
// Dynamic tool schema based on mode
function getSendEmailToolSchema(mode: EmailContentMode, templates: string[]) {
  const baseProperties = {
    to: { type: 'string', description: 'Recipient email' },
    subject: { type: 'string', description: 'Email subject' }
  };

  switch (mode) {
    case 'text':
      return {
        ...baseProperties,
        body: {
          type: 'string',
          description: 'Email body (plain text)'
        }
      };

    case 'html':
      return {
        ...baseProperties,
        body: {
          type: 'string',
          description: 'Email body (plain text fallback - REQUIRED)'
        },
        html: {
          type: 'string',
          description: 'Email body (HTML format with inline styles)'
        }
      };

    case 'template':
      return {
        ...baseProperties,
        template: {
          type: 'string',
          description: 'Template name to use',
          enum: templates
        },
        templateVars: {
          type: 'object',
          description: 'Variables to fill in template (e.g., {title: "...", content: "..."})'
        }
      };
  }
}

// Validation in send_email handler
async function handleSendEmail(params: any, ctx: any) {
  const emailResource = getEmailResource(ctx);
  const mode = emailResource.getContentMode();

  // Mode-specific validation
  switch (mode) {
    case 'text':
      if (params.html || params.template) {
        logger.warn('[SendEmail] HTML/template not allowed in text mode');
        delete params.html;
        delete params.template;
        delete params.templateVars;
      }
      break;

    case 'html':
      if (!params.body) {
        return { success: false, error: 'Plain text body required as fallback' };
      }
      if (!params.html) {
        logger.info('[SendEmail] No HTML provided, using text only');
      }
      break;

    case 'template':
      if (!params.template) {
        return { success: false, error: 'Template name required' };
      }
      if (!params.templateVars) {
        logger.warn('[SendEmail] No template vars, using empty object');
        params.templateVars = {};
      }

      // Apply template
      try {
        params.html = emailResource.applyTemplate(params.template, params.templateVars);
        // Auto-generate body from template vars if not provided
        if (!params.body) {
          params.body = Object.values(params.templateVars).join('\n\n');
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
      break;
  }

  // Send email via provider...
}
```

---

## Usage Examples

### Example 1: Simple Text Emails (Default)

```typescript
const client = new AIReceptionist({
  agent: { identity: { name: 'Sarah', role: 'Support' } },
  model: { provider: 'openai', apiKey: '...', model: 'gpt-4' }
});

await client.initialize();

// AI automatically sends text-only emails
// No configuration needed ✅
```

### Example 2: AI-Generated HTML

```typescript
await client.initialize();

// Enable HTML mode
client.email.setContentMode('html');

// AI now generates HTML markup
// System prompt tells AI to write HTML with inline styles
```

### Example 3: Professional Templates (Recommended)

```typescript
await client.initialize();

// Set template mode
client.email.setContentMode('template');

// Add company-branded templates
client.email.addHtmlTemplate('customer-service', `
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0;">{{companyName}}</h1>
  </div>

  <!-- Body -->
  <div style="background: white; padding: 30px; margin: 20px 0;">
    <h2 style="color: #333; margin-top: 0;">{{title}}</h2>
    {{mainContent}}
  </div>

  <!-- Footer -->
  <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
    {{footer}}
  </div>
</body>
</html>
`);

client.email.addHtmlTemplate('order-confirmation', `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
    <h1>✅ {{orderStatus}}</h1>
  </div>
  <div style="padding: 30px; background: white;">
    {{orderDetails}}
  </div>
  <div style="background: #f5f5f5; padding: 15px; text-align: center;">
    <p style="margin: 0; color: #666;">{{contactInfo}}</p>
  </div>
</body>
</html>
`);

// AI will use templates and fill in appropriate content
```

---

## System Prompt Integration

The system prompt automatically adjusts based on the active mode:

```typescript
// In SystemPromptBuilder or EmailResource
function buildSystemPrompt(emailResource: EmailResource): string {
  const basePrompt = `You are a helpful AI assistant...`;
  const emailInstructions = emailResource.getEmailContentInstructions();

  return `${basePrompt}\n\n${emailInstructions}`;
}
```

---

## Safety & Best Practices

### Text Mode (Default)
- ✅ **Always works** - Maximum compatibility
- ✅ **Best deliverability** - No HTML spam filters
- ✅ **Accessible** - Screen readers, etc.
- ✅ **Fast to generate** - AI doesn't overthink

### HTML Mode
- ⚠️ **Validate AI output** - Check for valid HTML
- ⚠️ **Monitor quality** - AI might create ugly emails
- ⚠️ **Test across clients** - Gmail, Outlook, Apple Mail
- ⚠️ **Require plain text fallback** - Always

### Template Mode (Recommended for HTML)
- ✅ **Consumer controls brand** - Consistent look
- ✅ **AI focuses on content** - Better quality
- ✅ **Easier to maintain** - Update template, not AI
- ✅ **Safer than free-form HTML** - Structure is fixed
- ✅ **Version control templates** - Track changes

---

## Migration Path

### Phase 1: Text Only (Now)
```typescript
// Everyone starts with text mode (default)
const client = new AIReceptionist({ /* ... */ });
```

### Phase 2: Add Templates (Recommended Next)
```typescript
client.email.setContentMode('template');
client.email.addHtmlTemplate('default', `...`);
```

### Phase 3: Full HTML (Advanced)
```typescript
client.email.setContentMode('html');
// Only if you trust AI to generate good HTML
```

---

## Files to Modify

1. **`src/resources/core/email.resource.ts`**
   - Add `contentMode` property
   - Add `setContentMode()` method
   - Add `addHtmlTemplate()` method
   - Add `getEmailContentInstructions()` method
   - Add `applyTemplate()` private method

2. **`src/tools/standard/email-tools.ts`**
   - Update `send_email` tool schema based on mode
   - Add validation for each mode
   - Add template application logic

3. **`src/types/index.ts`**
   - Add `EmailContentMode` type
   - Add template-related types

4. **System Prompt Builder**
   - Integrate `getEmailContentInstructions()` into system prompt

---

## Summary

**Three modes, one goal:** Give consumers control over AI email generation while maintaining safety and quality.

- **`text`** - Simple, safe, default
- **`html`** - AI writes HTML, more risk
- **`template`** - Best of both worlds ✅ (recommended for professional use)

**Key principle:** Consumer controls structure, AI enhances content.
