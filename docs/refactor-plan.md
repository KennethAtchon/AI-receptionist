# AI Receptionist SDK Refactoring Plan

## Overview

This document outlines the comprehensive refactoring plan to transform the AI Receptionist SDK from a traditional API-based architecture to a **webhook-driven, event-listening system** that can autonomously handle phone calls, SMS, and emails.

---

## Part 1: Goals & Vision

### 🎯 Primary Goals

#### 1. **Autonomous Event-Driven Architecture**
- Transform SDK from reactive API calls to proactive event listening
- Enable AI agents to sit and wait for incoming communications
- Implement webhook-based communication handling

#### 2. **Simplified Consumer Experience**
- Keep provider credential configuration (users still need to provide Twilio/Postmark credentials)
- Enable simple session setup: `client.setSession('phone', '+1234567890')`
- Provide webhook endpoint configuration for consumers to specify their webhook URLs

#### 3. **Provider Consolidation**
- **Twilio**: Handle both voice calls and SMS (single provider)
- **Postmark**: Handle email communications with inbound webhook support (remove SMTP/SendGrid/Resend)
- Remove unused providers to reduce complexity

#### 4. **Webhook-First Design**
- All external communications flow through webhooks
- SDK handles webhook routing and processing internally
- Consumers only provide webhook endpoints

### 🏗️ Architecture Vision

```
┌─────────────────────────────────────────────────────────────┐
│                    CONSUMER APPLICATION                     │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Webhook       │    │        AI Receptionist SDK      │ │
│  │   Endpoints     │◄───┤                                 │ │
│  │                 │    │  ┌─────────────────────────────┐ │ │
│  │ /webhook/sms    │    │  │      Webhook Router         │ │ │
│  │ /webhook/voice  │    │  │                             │ │ │
│  │ /webhook/email  │    │  └─────────────────────────────┘ │ │
│  └─────────────────┘    │              │                   │ │
│                         │              ▼                   │ │
│                         │  ┌─────────────────────────────┐ │ │
│                         │  │      Resource Manager       │ │ │
│                         │  │                             │ │ │
│                         │  │  • Voice Sessions           │ │ │
│                         │  │  • SMS Sessions             │ │ │
│                         │  │  • Email Sessions           │ │ │
│                         │  │  • Text Sessions            │ │ │
│                         │  └─────────────────────────────┘ │ │
│                         │              │                   │ │
│                         │              ▼                   │ │
│                         │  ┌─────────────────────────────┐ │ │
│                         │  │        AI Agent             │ │ │
│                         │  │                             │ │ │
│                         │  │  • Six-Pillar Architecture  │ │ │
│                         │  │  • Tool Execution           │ │ │
│                         │  │  • Memory Management        │ │ │
│                         │  └─────────────────────────────┘ │ │
│                         └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL PROVIDERS                       │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Twilio    │    │  Postmark   │    │   OpenAI    │    │
│  │             │    │             │    │             │    │
│  │ • Voice     │    │ • Email     │    │ • AI Model  │    │
│  │ • SMS       │    │ • Inbound   │    │ • Chat API  │    │
│  │ • Webhooks  │    │ • Webhooks  │    │             │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 Event Flow

1. **Incoming Communication** → External Provider (Twilio/Postmark)
2. **Provider Webhook** → Consumer Webhook Endpoint
3. **Consumer Routes** → AI Receptionist SDK
4. **SDK Processing** → AI Agent Analysis
5. **Agent Response** → Back to Provider
6. **Provider Delivery** → End User

---

## 📧 Email Provider Decision: Postmark vs Inbound by Exon

### Research Findings

After extensive research, **Inbound by Exon (inbound.new)** could not be found as a documented email service provider. The search results only returned information about Exon as a ride/delivery service platform in Nigeria, which is unrelated to email services.

### Why Postmark?

**Postmark** was selected as the replacement for Resend because it offers:

1. **Robust Inbound Email Processing**: Native support for inbound email webhooks
2. **Excellent Documentation**: Comprehensive API docs and integration guides
3. **Reliable Service**: Established email delivery platform with high deliverability
4. **Webhook Support**: Built-in webhook functionality for inbound emails
5. **Developer-Friendly**: Well-designed API with good SDK support

### Postmark Features for Our Use Case

- **Inbound Email Webhooks**: Automatically forwards incoming emails to specified webhook URLs
- **Email Parsing**: Handles email content, attachments, and metadata
- **Reliable Delivery**: High deliverability rates for outbound emails
- **API Integration**: RESTful API for programmatic control
- **Webhook Security**: Signature verification for webhook authenticity

---

## Part 2: Implementation Details

### 📋 Phase 1: Core Architecture Refactoring

#### 1.1 Webhook Configuration Interface

**New Configuration**: Add webhook configuration to main config

```typescript
// NEW: Webhook configuration interface
interface WebhookConfig {
  baseUrl: string;  // Consumer's webhook base URL
  endpoints: {
    voice: string;  // e.g., '/webhook/voice'
    sms: string;     // e.g., '/webhook/sms'
    email: string;  // e.g., '/webhook/email'
  };
}

// Updated main config interface
interface AIReceptionistConfig {
  agent: AgentConfiguration;
  model: AIModelConfig;
  providers: ProviderConfig;
  webhooks: WebhookConfig;  // NEW: Required for webhook-driven mode
  tools?: ToolConfig;
  debug?: boolean;
}
```

#### 1.2 Session Management System

**Current State**: Resources are stateless, each call is independent
**Target State**: Session-based resources that maintain state and context

```typescript
// NEW: Session-based approach
interface SessionManager {
  createSession(type: 'voice' | 'sms' | 'email', config: SessionConfig): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  endSession(id: string): Promise<void>;
  listActiveSessions(): Promise<Session[]>;
}

interface Session {
  id: string;
  type: 'voice' | 'sms' | 'email';
  status: 'active' | 'inactive' | 'completed';
  config: SessionConfig;
  conversationId: string;
  createdAt: Date;
  lastActivity: Date;
}
```

#### 1.3 Webhook Router Enhancement

**Current State**: Basic webhook handling in `WebhookRouter`
**Target State**: Comprehensive webhook processing with session management

```typescript
// ENHANCED: Webhook Router
class EnhancedWebhookRouter {
  // Route incoming webhooks to appropriate sessions
  async routeWebhook(
    type: 'voice' | 'sms' | 'email',
    payload: any,
    sessionId?: string
  ): Promise<WebhookResponse>;
  
  // Create new sessions from webhook data
  async createSessionFromWebhook(
    type: 'voice' | 'sms' | 'email',
    payload: any
  ): Promise<Session>;
  
  // Process webhook and generate response
  async processWebhook(session: Session, payload: any): Promise<any>;
}
```

#### 1.4 Resource Refactoring

**Current State**: Resources are simple wrappers around providers
**Target State**: Session-aware resources with webhook integration

```typescript
// REFACTORED: Session-aware resources
abstract class SessionResource<T extends Session> {
  protected sessionManager: SessionManager;
  protected webhookRouter: EnhancedWebhookRouter;
  
  // Create and manage sessions
  async createSession(config: SessionConfig): Promise<T>;
  async getSession(id: string): Promise<T | null>;
  async endSession(id: string): Promise<void>;
  
  // Handle incoming webhooks
  async handleWebhook(payload: any, sessionId?: string): Promise<any>;
  
  // Legacy API support (for backward compatibility)
  async send(options: SendOptions): Promise<Response>;
}
```

### 📋 Phase 2: Provider Consolidation

#### 2.1 Twilio Integration (Voice + SMS)

**Remove**: Separate voice and SMS resources
**Add**: Unified Twilio session management

```typescript
// NEW: Unified Twilio Session
interface TwilioSession extends Session {
  type: 'voice' | 'sms';
  phoneNumber: string;
  twilioConfig: TwilioConfig;
}

class TwilioResource extends SessionResource<TwilioSession> {
  // Handle both voice and SMS through single provider
  async createVoiceSession(phoneNumber: string): Promise<TwilioSession>;
  async createSMSSession(phoneNumber: string): Promise<TwilioSession>;
  
  // Unified webhook handling
  async handleTwilioWebhook(payload: any): Promise<any>;
}
```

#### 2.2 Postmark Integration (Email Only)

**Remove**: SMTP, SendGrid, and Resend providers
**Add**: Postmark provider with inbound webhook support

```typescript
// NEW: Postmark with inbound webhooks
interface PostmarkSession extends Session {
  emailAddress: string;
  postmarkConfig: PostmarkConfig;
}

class PostmarkResource extends SessionResource<PostmarkSession> {
  async createEmailSession(emailAddress: string): Promise<PostmarkSession>;
  async handlePostmarkWebhook(payload: any): Promise<any>;
}
```

#### 2.3 Provider Cleanup

**Files to Remove**:
- `src/providers/email/smtp.provider.ts`
- `src/providers/email/sendgrid.provider.ts`
- `src/providers/email/resend.provider.ts`
- `src/providers/validation/smtp-validator.ts`
- `src/providers/validation/sendgrid-validator.ts`
- `src/providers/validation/resend-validator.ts`

**Files to Create**:
- `src/providers/email/postmark.provider.ts` (new provider with inbound support)
- `src/providers/validation/postmark-validator.ts` (new validator)

**Files to Enhance**:
- `src/providers/api/twilio.provider.ts` (add SMS support)

### 📋 Phase 3: Consumer API Simplification

#### 3.1 New Consumer API

**Current API**:
```typescript
// Complex provider configuration
const client = new AIReceptionist({
  providers: {
    communication: {
      twilio: { accountSid: '...', authToken: '...', phoneNumber: '...' }
    },
    email: {
      postmark: { apiKey: '...', fromEmail: '...' }
    }
  }
});

// Manual resource usage
await client.voice?.make({ to: '+1234567890' });
await client.sms?.send({ to: '+1234567890', body: 'Hello' });
```

**New API**:
```typescript
// Provider credentials still required, but simplified session setup
const client = new AIReceptionist({
  agent: { identity: { name: 'Sarah', role: 'Assistant' } },
  model: { provider: 'openai', apiKey: '...', model: 'gpt-4' },
  providers: {
    communication: {
      twilio: { accountSid: '...', authToken: '...' }
    },
    email: {
      postmark: { apiKey: '...', fromEmail: '...' }
    }
  },
  webhooks: {
    baseUrl: 'https://your-app.com/webhooks',
    endpoints: {
      voice: '/voice',
      sms: '/sms', 
      email: '/email'
    }
  }
});

await client.initialize();

// Simple session setup with webhook configuration
await client.setSession('voice', '+1234567890');
await client.setSession('sms', '+1234567890');
await client.setSession('email', 'assistant@company.com');

// AI now listens and responds automatically via webhooks
```

#### 3.2 Webhook Endpoint Setup

**Consumer Responsibility**:
```typescript
// Consumer provides webhook endpoints that route to SDK
app.post('/webhook/voice', async (req, res) => {
  const response = await client.handleVoiceWebhook(req.body);
  res.send(response);
});

app.post('/webhook/sms', async (req, res) => {
  const response = await client.handleSMSWebhook(req.body);
  res.send(response);
});

app.post('/webhook/email', async (req, res) => {
  const response = await client.handleEmailWebhook(req.body);
  res.send(response);
});
```

**SDK Responsibility**:
```typescript
// SDK automatically configures Twilio/Resend webhooks using provided endpoints
class AIReceptionist {
  async setSession(type: 'voice' | 'sms' | 'email', identifier: string) {
    // 1. Create session
    const session = await this.createSession(type, identifier);
    
    // 2. Configure provider webhooks automatically
    if (type === 'voice' || type === 'sms') {
      await this.configureTwilioWebhooks(session);
    } else if (type === 'email') {
      await this.configurePostmarkWebhooks(session);
    }
    
    return session;
  }
  
  private async configureTwilioWebhooks(session: Session) {
    // Use Twilio API to set webhook URLs
    const webhookUrl = `${this.config.webhooks.baseUrl}${this.config.webhooks.endpoints.voice}`;
    await this.twilioProvider.updateWebhook(session.phoneNumber, webhookUrl);
  }
  
  private async configurePostmarkWebhooks(session: Session) {
    // Use Postmark API to set inbound webhook URL
    const webhookUrl = `${this.config.webhooks.baseUrl}${this.config.webhooks.endpoints.email}`;
    await this.postmarkProvider.updateInboundWebhook(session.emailAddress, webhookUrl);
  }
}
```

### 📋 Phase 4: Implementation Steps

#### Step 1: Create Session Management Infrastructure
1. Create `SessionManager` class
2. Define session interfaces and types
3. Implement session storage (in-memory initially)
4. Add session lifecycle management

#### Step 2: Enhance Webhook Router
1. Refactor `WebhookRouter` to handle sessions
2. Add session creation from webhook data
3. Implement webhook-to-session routing
4. Add webhook response generation

#### Step 3: Refactor Resources
1. Convert resources to session-based architecture
2. Implement session creation methods
3. Add webhook handling to each resource
4. Maintain backward compatibility

#### Step 4: Provider Consolidation
1. Remove SMTP, SendGrid, and Resend providers
2. Create new Postmark provider with inbound webhook support
3. Enhance Twilio provider for SMS + Voice
4. Update provider initialization

#### Step 5: Consumer API Updates
1. Add webhook configuration to main config interface
2. Add `setSession()` method to main client
3. Implement automatic webhook configuration with providers
4. Implement webhook handling methods
5. Update documentation and examples
6. Create migration guide

#### Step 6: Testing & Validation
1. Create comprehensive test suite
2. Test webhook flows end-to-end
3. Validate session management
4. Performance testing

### 📋 Phase 5: Migration Strategy

#### 5.1 Backward Compatibility
- Keep existing API methods working
- Add deprecation warnings for old patterns
- Provide migration utilities

#### 5.2 Gradual Migration
- Phase 1: Add new session-based API alongside existing
- Phase 2: Migrate examples to new API
- Phase 3: Deprecate old API methods
- Phase 4: Remove deprecated code

#### 5.3 Documentation Updates
- Update all examples to use new API
- Create webhook setup guides
- Add troubleshooting documentation
- Update architecture documentation

---

## 🎯 Success Metrics

### Technical Metrics
- **Reduced Complexity**: 50% fewer configuration options
- **Improved Performance**: 30% faster webhook processing
- **Better Reliability**: 99.9% webhook delivery success rate
- **Simplified Setup**: 80% reduction in setup time

### Developer Experience Metrics
- **Easier Onboarding**: 3-step setup vs 10-step setup
- **Better Documentation**: Clear webhook setup guides
- **Reduced Support**: Fewer configuration-related issues
- **Faster Development**: Quicker time-to-first-working-bot

---

## 🚀 Implementation Progress

### ✅ Completed (Phase 1 & 2)

**1. Session Management Infrastructure** ✓
- Created `SessionManager` class with full lifecycle management (`src/sessions/SessionManager.ts`)
- Defined session types (voice, sms, email, text) in `src/sessions/types.ts`
- Implemented session creation, retrieval, updates, and cleanup
- Added session-by-identifier lookup for webhook routing
- Added cleanup for old inactive sessions

**2. Webhook Router Enhancement** ✓
- Created `WebhookRouter` with comprehensive webhook processing (`src/webhooks/webhook-router.ts`)
- Added session creation from webhook data
- Implemented routing to existing/new sessions
- Added signature verification support (Postmark)
- Added error handling and TwiML response generation

**3. Main Client Integration** ✓
- Integrated `SessionManager` and `WebhookRouter` into `AIReceptionist` client
- Added `setSession(type, identifier, metadata?)` method for webhook-driven mode
- Added `handleVoiceWebhook()`, `handleSMSWebhook()`, `handleEmailWebhook()` methods
- Added `getSessionManager()` and `getWebhookRouter()` accessors
- Created webhook configuration infrastructure with validation

**4. Provider Consolidation** ✓
- ✅ Removed SMTP provider and validator
- ✅ Removed SendGrid provider and validator
- ✅ Removed Resend provider and validator
- ✅ Kept Postmark as sole email provider
- ✅ Updated provider index exports (`src/providers/index.ts`)
- ✅ Updated provider initialization to use Postmark only (`src/providers/initialization.ts`)
- ✅ Updated EmailRouter to handle Postmark webhooks (`src/providers/email/email-router.ts`)
- ✅ Added `getPostmarkProvider()` helper function

**5. Postmark Provider** ✓
- Full inbound webhook support (`src/providers/email/postmark.provider.ts`)
- Webhook signature verification with HMAC SHA-256
- Parse inbound email payload (PostmarkInboundEmail interface)
- Configure inbound webhooks
- Health check implementation

### 🚧 In Progress

**6. Resource Updates** (Next Priority)
- Need to update resources to be session-aware
- Need to add webhook handling to each resource
- Maintain backward compatibility with existing API

### 📋 Remaining Work

**7. Automatic Webhook Configuration**
- Implement Twilio webhook configuration API calls
- Implement Postmark webhook configuration API calls
- Update `configureProviderWebhook()` method in client (currently stubbed)

**8. Documentation & Examples**
- Update README with new webhook-driven API
- Create migration guide from old API to new API
- Add webhook setup examples for Express/Fastify/Next.js
- Update TypeScript examples
- Document Postmark inbound webhook setup

**9. Testing**
- Create test suite for session management
- Test webhook flows end-to-end
- Validate backward compatibility
- Performance testing

---

## 📝 Notes

- **Text Resource**: Remains unchanged as it's for development/testing
- **Tool System**: No changes needed, works with new architecture
- **Agent System**: No changes needed, works with new architecture
- **Memory System**: Enhanced to work with sessions
- **Provider System**: Simplified and consolidated

This refactoring will transform the SDK from a complex, configuration-heavy system to a simple, webhook-driven, event-listening AI agent that can autonomously handle communications across multiple channels.
