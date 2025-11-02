# Bulk Email Implementation Plan

## Overview
Add bulk email capabilities to the AI Receptionist SDK using Postmark's batch API (`sendEmailBatch`). This allows sending multiple emails in a single API call, improving performance and reducing rate limit issues.

---

## Implementation Steps

### 1. Add Bulk Email Method to PostmarkProvider

**File:** `src/providers/email/postmark.provider.ts`

**Changes:**
```typescript
import { EmailBatchRequest, EmailBatchResponse } from 'postmark';

export interface BulkEmailMessage {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
  metadata?: Record<string, string>;
  from?: string; // Optional override
  replyTo?: string;
}

export interface BulkEmailResult {
  to: string;
  messageId?: string;
  errorCode?: number;
  message?: string;
  success: boolean;
}

class PostmarkProvider {
  // ... existing code ...

  /**
   * Send batch emails (up to 500 per request)
   * Uses Postmark's sendEmailBatch endpoint
   */
  async sendBulk(messages: BulkEmailMessage[]): Promise<BulkEmailResult[]> {
    // Validate batch size (Postmark limit: 500)
    if (messages.length > 500) {
      throw new Error('Postmark batch limit is 500 emails per request');
    }

    // Convert to Postmark format
    const batch: EmailBatchRequest[] = messages.map(msg => ({
      From: msg.from || this.config.fromEmail,
      To: msg.to,
      Subject: msg.subject,
      HtmlBody: msg.htmlBody,
      TextBody: msg.textBody,
      Tag: msg.tag,
      Metadata: msg.metadata,
      ReplyTo: msg.replyTo,
      MessageStream: 'outbound'
    }));

    // Send batch
    const results = await this.client.sendEmailBatch(batch);

    // Convert to unified format
    return results.map((result, index) => ({
      to: messages[index].to,
      messageId: result.MessageID,
      errorCode: result.ErrorCode,
      message: result.Message,
      success: result.ErrorCode === 0
    }));
  }

  /**
   * Send batch emails in chunks (for > 500 emails)
   */
  async sendBulkChunked(
    messages: BulkEmailMessage[],
    chunkSize = 500
  ): Promise<BulkEmailResult[]> {
    const results: BulkEmailResult[] = [];

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      const chunkResults = await this.sendBulk(chunk);
      results.push(...chunkResults);

      // Rate limiting: wait between chunks
      if (i + chunkSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
```

---

### 2. Add Bulk Email Tool

**File:** `src/tools/standard/email-tools.ts`

**Add new tool:**
```typescript
export function createBulkEmailTool(): ITool {
  return {
    name: 'send_bulk_emails',
    description: 'Send multiple emails at once (up to 500 per batch). Use for newsletters, campaigns, or batch notifications.',
    parameters: {
      type: 'object',
      properties: {
        emails: {
          type: 'array',
          description: 'Array of email messages to send',
          items: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient email address'
              },
              subject: {
                type: 'string',
                description: 'Email subject line'
              },
              body: {
                type: 'string',
                description: 'Email body (HTML or plain text)'
              },
              tag: {
                type: 'string',
                description: 'Optional tag for tracking (e.g., "newsletter", "campaign")'
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata for tracking'
              }
            },
            required: ['to', 'subject', 'body']
          }
        }
      },
      required: ['emails']
    },
    handler: async (args: any, context: ExecutionContext): Promise<ToolResult> => {
      const postmarkProvider = await context.providerRegistry.get<PostmarkProvider>('email');

      if (!postmarkProvider) {
        return {
          success: false,
          error: 'Email provider not configured'
        };
      }

      // Convert tool input to provider format
      const messages: BulkEmailMessage[] = args.emails.map((email: any) => ({
        to: email.to,
        subject: email.subject,
        htmlBody: email.body.includes('<') ? email.body : undefined,
        textBody: email.body.includes('<') ? undefined : email.body,
        tag: email.tag,
        metadata: email.metadata
      }));

      try {
        const results = await postmarkProvider.sendBulk(messages);

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return {
          success: true,
          data: {
            total: results.length,
            successful,
            failed,
            results: results.map(r => ({
              to: r.to,
              success: r.success,
              messageId: r.messageId,
              error: r.success ? undefined : r.message
            }))
          },
          message: `Sent ${successful}/${results.length} emails successfully`
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send bulk emails'
        };
      }
    }
  };
}
```

**Register in tool initialization:**
```typescript
// In src/tools/initialization.ts
if (emailProvider) {
  registry.register(createSendEmailTool());
  registry.register(createBulkEmailTool()); // Add this line
}
```

---

### 3. Add Bulk Email Method to EmailResource

**File:** `src/resources/core/email.resource.ts`

**Add method:**
```typescript
export interface BulkEmailOptions {
  emails: Array<{
    to: string;
    subject: string;
    body: string;
    tag?: string;
    metadata?: Record<string, string>;
  }>;
  chunkSize?: number; // For auto-chunking
}

class EmailResource {
  // ... existing code ...

  /**
   * Send bulk emails
   *
   * @example
   * ```typescript
   * const results = await email.sendBulk({
   *   emails: [
   *     { to: 'user1@example.com', subject: 'Hello', body: 'Hi there!' },
   *     { to: 'user2@example.com', subject: 'Hello', body: 'Hi there!' }
   *   ]
   * });
   * ```
   */
  async sendBulk(options: BulkEmailOptions): Promise<BulkEmailResult[]> {
    // Use tool execution for consistency with other operations
    const result = await this.agent.executeTool('send_bulk_emails', {
      emails: options.emails
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send bulk emails');
    }

    return result.data.results;
  }
}
```

---

### 4. Add Types

**File:** `src/types/email.types.ts`

**Add exports:**
```typescript
export interface BulkEmailMessage {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
  metadata?: Record<string, string>;
  from?: string;
  replyTo?: string;
}

export interface BulkEmailResult {
  to: string;
  messageId?: string;
  errorCode?: number;
  message?: string;
  success: boolean;
}
```

---

### 5. Update Package Exports

**File:** `src/index.ts`

**Add exports:**
```typescript
// Email types
export type {
  BulkEmailMessage,
  BulkEmailResult,
  // ... existing exports
} from './types/email.types';
```

---

## Usage Examples

### Example 1: Direct Provider Usage (No Agent)
```typescript
import { AIReceptionist } from '@atchonk/ai-receptionist';

const client = new AIReceptionist({...});
await client.initialize();

// Get provider directly
const registry = client.getProviderRegistry();
const postmark = await registry.get('email');

// Send bulk emails
const results = await postmark.sendBulk([
  { to: 'user1@example.com', subject: 'Newsletter', htmlBody: '<p>Hello!</p>' },
  { to: 'user2@example.com', subject: 'Newsletter', htmlBody: '<p>Hello!</p>' }
]);

console.log(`Sent ${results.filter(r => r.success).length} emails`);
```

### Example 2: Using Email Resource
```typescript
const client = new AIReceptionist({...});
await client.initialize();

const results = await client.email.sendBulk({
  emails: [
    { to: 'lead1@example.com', subject: 'Follow-up', body: 'Hi!' },
    { to: 'lead2@example.com', subject: 'Follow-up', body: 'Hi!' }
  ]
});
```

### Example 3: AI Agent Uses Tool (Autonomous)
```typescript
const response = await client.text.generate({
  message: 'Send a follow-up email to all leads in the nurture campaign',
  sessionId: 'campaign-123'
});

// Agent will use send_bulk_emails tool automatically
```

### Example 4: Loctelli Backend Integration
```typescript
// In NestJS service
@Injectable()
export class EmailCampaignService {
  constructor(private aiReceptionist: AIReceptionistTestService) {}

  async sendCampaignToLeads(campaignId: string) {
    const leads = await this.getLeadsForCampaign(campaignId);
    const receptionist = this.aiReceptionist.getReceptionist();
    const registry = receptionist.getProviderRegistry();
    const postmark = await registry.get('email');

    // Prepare bulk emails
    const emails = leads.map(lead => ({
      to: lead.email,
      subject: 'Your personalized message',
      htmlBody: this.generateEmailBody(lead),
      tag: `campaign-${campaignId}`,
      metadata: {
        leadId: lead.id,
        campaignId
      }
    }));

    // Send in batches
    const results = await postmark.sendBulkChunked(emails, 500);

    // Log results
    this.logger.log(`Campaign sent: ${results.filter(r => r.success).length}/${results.length}`);

    return results;
  }
}
```

---

## Testing Plan

### Unit Tests
```typescript
describe('PostmarkProvider.sendBulk', () => {
  it('should send batch of emails', async () => {
    const results = await provider.sendBulk([
      { to: 'test@example.com', subject: 'Test', htmlBody: '<p>Test</p>' }
    ]);

    expect(results[0].success).toBe(true);
  });

  it('should reject batches > 500', async () => {
    const emails = Array(501).fill({ to: 'test@example.com', subject: 'Test', htmlBody: 'Test' });
    await expect(provider.sendBulk(emails)).rejects.toThrow('500 emails');
  });

  it('should chunk large batches', async () => {
    const emails = Array(1000).fill({ to: 'test@example.com', subject: 'Test', htmlBody: 'Test' });
    const results = await provider.sendBulkChunked(emails);

    expect(results).toHaveLength(1000);
  });
});
```

---

## Performance Considerations

1. **Batch Size**: Postmark limit is 500 emails per request
2. **Rate Limiting**: Add 1-second delay between chunks
3. **Memory**: For very large batches (10k+), stream results instead of loading all into memory
4. **Error Handling**: Some emails in batch may fail - handle partial success
5. **Retries**: Implement retry logic for failed chunks

---

## Security Considerations

1. **Recipient Validation**: Validate email addresses before sending
2. **Rate Limiting**: Implement application-level rate limiting
3. **Spam Prevention**: Add unsubscribe links, proper headers
4. **Data Sanitization**: Escape HTML content to prevent XSS
5. **Metadata Privacy**: Don't include sensitive data in metadata

---

## Migration Path

### Phase 1: Add Provider Method ✅
- Implement `sendBulk()` in PostmarkProvider
- Add types and interfaces

### Phase 2: Add Tool ✅
- Create `send_bulk_emails` tool
- Register in tool initialization

### Phase 3: Add Resource Method ✅
- Add `sendBulk()` to EmailResource
- Update documentation

### Phase 4: Integration Testing
- Test with real Postmark API
- Test in Loctelli backend

### Phase 5: Production Deployment
- Deploy to staging
- Monitor error rates
- Roll out to production

---

## Timeline Estimate

- **Provider Implementation**: 2 hours
- **Tool Implementation**: 1 hour
- **Resource Integration**: 1 hour
- **Testing**: 2 hours
- **Documentation**: 1 hour
- **Total**: ~7 hours

---

## Success Metrics

- ✅ Can send 500 emails in single batch (<5 seconds)
- ✅ Can handle 10k emails with chunking (<2 minutes)
- ✅ <1% error rate in production
- ✅ Proper error reporting for failed emails
- ✅ Integration with Loctelli campaign system
