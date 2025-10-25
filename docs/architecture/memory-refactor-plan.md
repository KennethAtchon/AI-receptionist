# Memory System Refactoring Plan

## Executive Summary

This document outlines a comprehensive plan to refactor the AI Receptionist SDK's memory system from a **system-prompt-based approach** to a **conversation-history-based approach**. The current implementation includes memory context within the system prompt, which causes token bloat and makes prompts less maintainable. The refactored system will pass only conversation history (messages between user and assistant) to the AI provider, keeping the system prompt clean and focused on identity, personality, knowledge, goals, and behavioral guidelines.

---

## Current State Analysis

### How Memory Works Today

1. **Memory Storage**
   - Memories are stored with rich metadata (type, importance, channel, sessionMetadata, etc.)
   - Three tiers: Short-term (in-memory), Long-term (database), Vector (semantic search)
   - Storage works well and should be preserved

2. **Memory Retrieval & Injection**
   - `MemoryManager.retrieve()` fetches relevant context based on conversationId
   - Returns `MemoryContext` with three components:
     - `shortTerm`: Recent conversation messages
     - `longTerm`: Important historical memories
     - `semantic`: Semantically similar past interactions

3. **Problem: Memory in System Prompt**
   - `SystemPromptBuilder.buildMemoryContextSection()` converts memory into a text section
   - This section is injected into the system prompt (lines 52-54 in `SystemPromptBuilder.ts`)
   - Example output:
     ```
     # RELEVANT CONTEXT FROM MEMORY

     ## Recent Conversation
     - user: Hello, I'd like to schedule an appointment
     - assistant: I'd be happy to help you schedule an appointment...

     ## Important Facts Recalled
     - User prefers morning appointments
     - User is a VIP client
     ```
   - This causes:
     - **Token bloat**: Memory context can consume 500-2000+ tokens
     - **Redundancy**: Conversation history appears in both system prompt AND message history
     - **Maintenance burden**: System prompt changes every request
     - **Poor separation of concerns**: System prompt should define "who you are", not "what happened"

### Current Flow

```
User Request
    ↓
1. MemoryManager.retrieve(input, context)
    ↓ Returns MemoryContext { shortTerm, longTerm, semantic }
    ↓
2. SystemPromptBuilder.build()
    ↓ Includes buildMemoryContextSection() - PROBLEM
    ↓ Generates system prompt WITH memory context
    ↓
3. Agent.execute()
    ↓ Calls aiProvider.chat() with:
    ↓   - systemPrompt (includes memory context)
    ↓   - conversationHistory (also includes shortTerm messages)
    ↓   - userMessage
    ↓
4. AI Provider receives DUPLICATE conversation data
```

**Key Issue**: `conversationHistory` parameter and `memoryContext.shortTerm` contain the same messages, and the system prompt also includes a textual representation of this data. This is inefficient and confusing.

---

## Desired State

### Goals

1. **Clean System Prompt**: Remove all memory/conversation context from system prompt
2. **Conversation History Only**: Pass full conversation history as structured messages to AI provider
3. **Maintain Storage**: Keep existing memory storage system (it works well)
4. **Backward Compatibility**: Minimize breaking changes to public API

### New Flow

```
User Request
    ↓
1. MemoryManager.retrieve(input, context)
    ↓ Returns MemoryContext { shortTerm, longTerm, semantic }
    ↓
2. SystemPromptBuilder.build()
    ↓ NO MEMORY SECTION - only identity, personality, knowledge, goals, guidelines
    ↓ Generates clean, static system prompt
    ↓
3. Agent.execute()
    ↓ Builds conversationHistory from memoryContext
    ↓   - shortTerm: Recent messages (user ↔ assistant)
    ↓   - longTerm: Injected as system messages with context
    ↓   - semantic: Optional - injected as system messages
    ↓ Calls aiProvider.chat() with:
    ↓   - systemPrompt (static, identity-focused)
    ↓   - conversationHistory (complete message array)
    ↓   - userMessage
    ↓
4. AI Provider receives:
    - Clean system prompt defining WHO the agent is
    - Full conversation history showing WHAT happened
```

---

## Implementation Plan

### Phase 1: Refactor MemoryManager (No Breaking Changes)

**Objective**: Update `MemoryManager.retrieve()` to return structured conversation history instead of raw memories.

#### Changes to `MemoryManager.ts`

1. **Update `retrieve()` return type**:
   ```typescript
   // BEFORE
   async retrieve(input: string, context?: {
     conversationId?: string;
     channel?: Channel;
   }): Promise<MemoryContext>

   // AFTER
   async retrieve(input: string, context?: {
     conversationId?: string;
     channel?: Channel;
   }): Promise<ConversationHistory>
   ```

2. **New type: `ConversationHistory`**:
   ```typescript
   export interface ConversationHistory {
     // Core conversation messages (user ↔ assistant)
     messages: Message[];

     // Optional: Context messages (long-term/semantic memories as system messages)
     contextMessages?: Message[];

     // Metadata for debugging/logging
     metadata: {
       conversationId?: string;
       messageCount: number;
       oldestMessageTimestamp?: Date;
       newestMessageTimestamp?: Date;
       hasLongTermContext: boolean;
       hasSemanticContext: boolean;
     };
   }
   ```

3. **Refactor `retrieve()` implementation**:
   ```typescript
   public async retrieve(input: string, context?: {
     conversationId?: string;
     channel?: Channel;
   }): Promise<ConversationHistory> {
     const messages: Message[] = [];
     const contextMessages: Message[] = [];

     // 1. Get short-term conversation history
     if (context?.conversationId) {
       const conversationMemories = this.shortTerm.getAll().filter(
         m => m.sessionMetadata?.conversationId === context.conversationId
       );
       messages.push(...this.convertMemoriesToMessages(conversationMemories));
     }

     // 2. Get long-term context (injected as system messages)
     if (this.longTerm && context?.conversationId) {
       try {
         const keywords = this.extractKeywords(input);
         const searchQuery: MemorySearchQuery = {
           keywords,
           limit: 5,
           minImportance: 5,
           conversationId: context.conversationId
         };

         const longTermMemories = await this.longTerm.search(searchQuery);

         // Convert to context messages
         if (longTermMemories.length > 0) {
           contextMessages.push({
             role: 'system',
             content: this.formatLongTermContext(longTermMemories),
             timestamp: new Date()
           });
         }
       } catch (error) {
         logger.warn('[MemoryManager] Long-term memory search failed', { error });
       }
     }

     // 3. Get semantic context (optional)
     if (this.vector && context?.conversationId) {
       try {
         const embedding = await this.generateEmbedding(input);
         const semanticMemories = await this.vector.similaritySearch(embedding, {
           limit: 3,
           threshold: 0.8
         });

         if (semanticMemories.length > 0) {
           contextMessages.push({
             role: 'system',
             content: this.formatSemanticContext(semanticMemories),
             timestamp: new Date()
           });
         }
       } catch (error) {
         logger.warn('[MemoryManager] Vector memory search failed', { error });
       }
     }

     return {
       messages,
       contextMessages,
       metadata: {
         conversationId: context?.conversationId,
         messageCount: messages.length,
         oldestMessageTimestamp: messages[0]?.timestamp,
         newestMessageTimestamp: messages[messages.length - 1]?.timestamp,
         hasLongTermContext: contextMessages.some(m => m.content.includes('Important Facts')),
         hasSemanticContext: contextMessages.some(m => m.content.includes('Similar Past'))
       }
     };
   }

   // Helper: Format long-term memories as context
   private formatLongTermContext(memories: Memory[]): string {
     let context = 'Relevant context from past interactions:\n';
     for (const memory of memories) {
       context += `- ${memory.content}\n`;
     }
     return context.trim();
   }

   // Helper: Format semantic memories as context
   private formatSemanticContext(memories: Memory[]): string {
     let context = 'Similar past interactions that may be relevant:\n';
     for (const memory of memories) {
       const summary = (memory.metadata as any)?.summary || memory.content;
       context += `- ${summary}\n`;
     }
     return context.trim();
   }
   ```

4. **Keep backward compatibility**:
   - Keep `MemoryContext` type for now (deprecated)
   - Add a `retrieveLegacy()` method that returns old format if needed

#### Files to Modify
- `src/agent/memory/MemoryManager.ts`
- `src/agent/types/memory.types.ts` (add `ConversationHistory` type)

---

### Phase 2: Remove Memory from System Prompt

**Objective**: Clean up `SystemPromptBuilder` to stop injecting memory context.

#### Changes to `SystemPromptBuilder.ts`

1. **Remove `buildMemoryContextSection()`**:
   - Delete the method entirely (lines 283-324)

2. **Update `build()` method**:
   ```typescript
   // BEFORE (lines 51-54)
   if (context.memoryContext) {
     sections.push(this.buildMemoryContextSection(context.memoryContext));
   }

   // AFTER
   // Remove this entire block - memory is handled via conversation history
   ```

3. **Update `PromptContext` type**:
   ```typescript
   // In src/agent/types/prompt.types.ts
   export interface PromptContext {
     identity?: Identity;
     personality?: PersonalityEngine;
     knowledge?: KnowledgeBase;
     goals?: Goal[];
     channel?: Channel;

     // REMOVE:
     // memoryContext?: MemoryContext;  ← DELETE THIS

     // Optional configurations
     maxTokens?: number;
     policies?: Array<{ name: string; rule: string }>;
     escalationRules?: string[];
     examples?: PromptExample[];
   }
   ```

#### Files to Modify
- `src/agent/prompt/SystemPromptBuilder.ts`
- `src/agent/types/prompt.types.ts`

---

### Phase 3: Update Agent to Use Conversation History

**Objective**: Modify `Agent.process()` and `Agent.execute()` to build and pass conversation history correctly.

#### Changes to `Agent.ts`

1. **Update `process()` method**:
   ```typescript
   // BEFORE (lines 153-173)
   const memoryContext = await this.memory.retrieve(request.input, {
     conversationId: request.context.conversationId,
     channel: request.channel
   });
   this.tracer.log('memory_retrieval', memoryContext);

   const systemPrompt = request.channel
     ? await this.promptBuilder.build({
         identity: this.identity,
         personality: this.personality,
         knowledge: this.knowledge,
         goals: this.goals.getCurrent(),
         channel: request.channel
       })
     : this.cachedSystemPrompt!;

   const response = await this.execute(request, systemPrompt, memoryContext);

   // AFTER
   const conversationHistory = await this.memory.retrieve(request.input, {
     conversationId: request.context.conversationId,
     channel: request.channel
   });
   this.tracer.log('conversation_history_retrieval', conversationHistory);

   const systemPrompt = request.channel
     ? await this.promptBuilder.build({
         identity: this.identity,
         personality: this.personality,
         knowledge: this.knowledge,
         goals: this.goals.getCurrent(),
         channel: request.channel
       })
     : this.cachedSystemPrompt!;

   const response = await this.execute(request, systemPrompt, conversationHistory);
   ```

2. **Update `execute()` signature and implementation**:
   ```typescript
   // BEFORE (lines 209-226)
   private async execute(
     request: AgentRequest,
     systemPrompt: string,
     memoryContext: MemoryContext
   ): Promise<AgentResponse> {
     const availableTools = this.toolRegistry
       ? this.toolRegistry.listAvailable(request.channel)
       : [];

     const aiResponse = await this.aiProvider.chat({
       conversationId: request.context.conversationId,
       userMessage: request.input,
       conversationHistory: memoryContext.shortTerm || [],
       availableTools: availableTools,
       systemPrompt: systemPrompt
     });

     // ... rest of method
   }

   // AFTER
   private async execute(
     request: AgentRequest,
     systemPrompt: string,
     conversationHistory: ConversationHistory
   ): Promise<AgentResponse> {
     const availableTools = this.toolRegistry
       ? this.toolRegistry.listAvailable(request.channel)
       : [];

     // Build full message array
     const fullHistory: Message[] = [
       // 1. Context messages (long-term/semantic) - if any
       ...(conversationHistory.contextMessages || []),
       // 2. Actual conversation messages (user ↔ assistant)
       ...conversationHistory.messages
     ];

     const aiResponse = await this.aiProvider.chat({
       conversationId: request.context.conversationId,
       userMessage: request.input,
       conversationHistory: fullHistory,
       availableTools: availableTools,
       systemPrompt: systemPrompt
     });

     // ... rest of method
   }
   ```

3. **Update memory storage** (lines 177-184):
   ```typescript
   // Store conversation messages properly
   await this.memory.store({
     id: `${interactionId}-user`,
     content: request.input,
     timestamp: new Date(),
     type: 'conversation',
     role: 'user',
     channel: request.channel,
     sessionMetadata: {
       conversationId: request.context.conversationId
     },
     importance: 5
   });

   await this.memory.store({
     id: `${interactionId}-assistant`,
     content: response.content,
     timestamp: new Date(),
     type: 'conversation',
     role: 'assistant',
     channel: request.channel,
     sessionMetadata: {
       conversationId: request.context.conversationId
     },
     importance: 5
   });
   ```

#### Files to Modify
- `src/agent/core/Agent.ts`

---

### Phase 4: Update Type Definitions

**Objective**: Add new types and update existing ones.

#### New Types to Add

```typescript
// In src/agent/types/memory.types.ts

/**
 * Conversation history returned by MemoryManager
 */
export interface ConversationHistory {
  /**
   * Core conversation messages (user ↔ assistant interactions)
   */
  messages: Message[];

  /**
   * Context messages (long-term/semantic memories as system messages)
   * These are injected before the conversation messages
   */
  contextMessages?: Message[];

  /**
   * Metadata about the conversation history
   */
  metadata: ConversationHistoryMetadata;
}

export interface ConversationHistoryMetadata {
  conversationId?: string;
  messageCount: number;
  oldestMessageTimestamp?: Date;
  newestMessageTimestamp?: Date;
  hasLongTermContext: boolean;
  hasSemanticContext: boolean;
}

/**
 * @deprecated Use ConversationHistory instead
 */
export interface MemoryContext {
  shortTerm: Message[];
  longTerm: Memory[];
  semantic: Memory[];
}
```

#### Files to Modify
- `src/agent/types/memory.types.ts`
- `src/agent/types/index.ts` (export new types)

---

### Phase 5: Update Documentation

**Objective**: Update architecture docs to reflect new approach.

#### Files to Update

1. **`docs/architecture/storage.md`**:
   - Update "Complete Storage Flow" diagram
   - Update "Data Flow Example" sequence diagram
   - Update "Memory Manager Integration" section
   - Remove references to memory in system prompt

2. **`docs/architecture/prompts.md`** (if exists):
   - Document that system prompts are now static
   - Explain conversation history approach

3. **`README.md`**:
   - Update examples to show new usage patterns

---

## Migration Guide for Users

### Breaking Changes

1. **MemoryContext removed from PromptContext**:
   ```typescript
   // BEFORE
   const prompt = await promptBuilder.build({
     identity,
     personality,
     knowledge,
     goals,
     memoryContext  // ← No longer supported
   });

   // AFTER
   const prompt = await promptBuilder.build({
     identity,
     personality,
     knowledge,
     goals
   });
   // Memory is now handled via conversation history in aiProvider.chat()
   ```

2. **MemoryManager.retrieve() returns `ConversationHistory`**:
   ```typescript
   // BEFORE
   const memoryContext: MemoryContext = await memoryManager.retrieve(input, context);
   // memoryContext.shortTerm, memoryContext.longTerm, memoryContext.semantic

   // AFTER
   const conversationHistory: ConversationHistory = await memoryManager.retrieve(input, context);
   // conversationHistory.messages, conversationHistory.contextMessages
   ```

### Non-Breaking Changes

- Memory storage API remains unchanged
- Public SDK methods (`sdk.calls.make()`, `sdk.sms.send()`, etc.) remain unchanged
- All internal refactoring is transparent to SDK users

---

## Benefits of This Refactoring

### 1. **Token Efficiency**
- **Before**: System prompt includes 500-2000 tokens of memory context
- **After**: System prompt is ~60% smaller, reusable across requests
- **Impact**: Lower API costs, faster responses

### 2. **Better Separation of Concerns**
- **System Prompt**: Defines WHO the agent is (identity, personality, guidelines)
- **Conversation History**: Shows WHAT happened (actual interactions)
- **Cleaner architecture**: Each component has a single responsibility

### 3. **Improved Caching**
- System prompts can be cached more effectively
- Only conversation history changes per request
- Better performance with prompt caching from providers like Anthropic

### 4. **Easier Debugging**
- System prompt is static and predictable
- Conversation history is structured and inspectable
- Clearer separation makes issues easier to trace

### 5. **More Maintainable**
- System prompt changes only when identity/personality changes
- No need to rebuild system prompt every request
- Less complex prompt building logic

### 6. **Standards Compliance**
- Follows best practices from OpenAI, Anthropic, Google
- System prompt = instructions, Messages = conversation
- Better alignment with how LLMs are designed to be used

---

## Testing Plan

### Unit Tests

1. **MemoryManager Tests**:
   ```typescript
   describe('MemoryManager.retrieve()', () => {
     it('should return ConversationHistory with messages', async () => {
       const history = await memoryManager.retrieve('test input', {
         conversationId: 'conv-123'
       });
       expect(history.messages).toBeDefined();
       expect(history.metadata.messageCount).toBeGreaterThan(0);
     });

     it('should include context messages from long-term memory', async () => {
       // Setup long-term memories
       await memoryManager.store({
         id: 'mem-1',
         content: 'User prefers morning appointments',
         type: 'decision',
         importance: 8,
         timestamp: new Date()
       });

       const history = await memoryManager.retrieve('schedule appointment', {
         conversationId: 'conv-123'
       });

       expect(history.contextMessages).toBeDefined();
       expect(history.metadata.hasLongTermContext).toBe(true);
     });
   });
   ```

2. **SystemPromptBuilder Tests**:
   ```typescript
   describe('SystemPromptBuilder', () => {
     it('should NOT include memory context section', async () => {
       const prompt = await promptBuilder.build({
         identity,
         personality,
         knowledge,
         goals
       });

       expect(prompt).not.toContain('# RELEVANT CONTEXT FROM MEMORY');
       expect(prompt).not.toContain('## Recent Conversation');
     });

     it('should only include identity, personality, knowledge, goals', async () => {
       const prompt = await promptBuilder.build({
         identity,
         personality,
         knowledge,
         goals
       });

       expect(prompt).toContain('# IDENTITY');
       expect(prompt).toContain('# PERSONALITY');
       expect(prompt).toContain('# KNOWLEDGE');
       expect(prompt).toContain('# GOALS');
     });
   });
   ```

3. **Agent Tests**:
   ```typescript
   describe('Agent.process()', () => {
     it('should pass conversation history to AI provider', async () => {
       const spy = jest.spyOn(aiProvider, 'chat');

       await agent.process({
         id: 'req-1',
         input: 'Hello',
         channel: 'call',
         context: { conversationId: 'conv-123' }
       });

       expect(spy).toHaveBeenCalledWith(
         expect.objectContaining({
           conversationHistory: expect.arrayContaining([
             expect.objectContaining({ role: 'user' }),
             expect.objectContaining({ role: 'assistant' })
           ])
         })
       );
     });
   });
   ```

### Integration Tests

1. **End-to-end conversation flow**:
   - Create conversation
   - Send multiple messages
   - Verify conversation history grows correctly
   - Verify context messages are injected

2. **Long-term memory integration**:
   - Store high-importance memories
   - Verify they appear as context messages
   - Verify they don't appear in system prompt

3. **Multi-channel conversations**:
   - Test call, SMS, email channels
   - Verify conversation history is channel-specific

---

## Implementation Checklist

### Phase 1: MemoryManager
- [ ] Add `ConversationHistory` type to `memory.types.ts`
- [ ] Update `MemoryManager.retrieve()` to return `ConversationHistory`
- [ ] Add helper methods: `formatLongTermContext()`, `formatSemanticContext()`
- [ ] Write unit tests for new retrieve method
- [ ] Update existing tests

### Phase 2: SystemPromptBuilder
- [ ] Remove `buildMemoryContextSection()` method
- [ ] Remove memory section from `build()` method
- [ ] Update `PromptContext` type (remove `memoryContext`)
- [ ] Update unit tests to verify no memory in system prompt
- [ ] Update `getSections()` to remove MEMORY section

### Phase 3: Agent
- [ ] Update `process()` to use `ConversationHistory`
- [ ] Update `execute()` signature and implementation
- [ ] Update memory storage to store user and assistant messages separately
- [ ] Write integration tests for conversation flow
- [ ] Update tracer log names

### Phase 4: Types
- [ ] Add `ConversationHistory` type
- [ ] Add `ConversationHistoryMetadata` type
- [ ] Deprecate `MemoryContext` type
- [ ] Export new types from `index.ts`

### Phase 5: Documentation
- [ ] Update `docs/architecture/storage.md`
- [ ] Update `docs/architecture/prompts.md` (if exists)
- [ ] Update `README.md` with examples
- [ ] Create migration guide
- [ ] Update API reference docs

### Phase 6: Testing
- [ ] Run full test suite
- [ ] Test with real AI providers (OpenAI, Anthropic)
- [ ] Test multi-turn conversations
- [ ] Test long-term memory retrieval
- [ ] Performance testing (compare token usage before/after)

---

## Rollback Plan

If issues arise during implementation:

1. **Phase 1-2**: Can be rolled back independently
2. **Phase 3**: Requires coordination with Phase 1-2
3. Keep `MemoryContext` type as deprecated for backward compatibility
4. Maintain `retrieveLegacy()` method if needed

---

## Timeline Estimate

- **Phase 1** (MemoryManager): 4-6 hours
- **Phase 2** (SystemPromptBuilder): 2-3 hours
- **Phase 3** (Agent): 3-4 hours
- **Phase 4** (Types): 1-2 hours
- **Phase 5** (Documentation): 3-4 hours
- **Phase 6** (Testing): 4-6 hours

**Total**: 17-25 hours (2-3 days)

---

## Success Metrics

1. **Token Reduction**: System prompt tokens reduced by 50-70%
2. **Performance**: No degradation in response quality
3. **Tests**: All existing tests pass + new tests added
4. **Documentation**: Complete migration guide available
5. **Backward Compatibility**: No breaking changes to public SDK API

---

## Questions & Considerations

### Q: Should we completely remove `MemoryContext` type?
**A**: Deprecate it but keep for backward compatibility. Remove in next major version.

### Q: How do we handle very long conversation histories?
**A**: `PromptOptimizer.compressChatHistory()` already handles this. Continue using it to compress old messages.

### Q: What about semantic/vector memories?
**A**: Include them as context messages (system role) before the conversation. This gives the AI relevant past interactions without bloating the system prompt.

### Q: Should context messages be at the start or end of history?
**A**: **Start**. Place context messages (long-term/semantic) before conversation messages so they provide background, then the actual conversation flows chronologically.

### Q: How does this affect prompt caching?
**A**: **Positively**. Static system prompts can be cached by providers like Anthropic, reducing costs and latency.

---

## Conclusion

This refactoring will modernize the memory system to follow industry best practices while maintaining backward compatibility. The separation of system prompt (identity/instructions) from conversation history (what happened) will result in cleaner code, lower token costs, and better maintainability.

**Recommendation**: Proceed with implementation in phases, starting with Phase 1 (MemoryManager) as a proof of concept.
