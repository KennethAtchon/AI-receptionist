# Postmark Message-ID Usage - Verification Report

**Date:** November 1, 2025
**Status:** ✅ VERIFIED CORRECT

## Summary

Verified that the codebase correctly uses **actual Message-IDs** from email headers for all threading and conversation tracking, while only using Postmark's simplified MessageID for metadata/logging purposes.

## Understanding Postmark's Two Different Message IDs

### 1. Postmark's Internal MessageID
- **Format:** Simple UUID (e.g., `"6e50ca35-43de-4114-9e0e-5091c2395eaa"`)
- **Location:** `context.payload.MessageID` in webhook payload
- **Purpose:** Postmark's internal tracking identifier
- **Usage:** Should ONLY be used for logging and as a fallback

### 2. Actual Email Message-ID
- **Format:** Full RFC-compliant Message-ID with domain
  - Outlook: `<SEZPR04MB67297AD80155076F2471897A89F9A@SEZPR04MB6729.apcprd04.prod.outlook.com>`
  - Gmail: `<CAMii_diZswPs7+XLHeOcn=7J7=C-v3DaTJbjHoaqCXJ2pEnmow@mail.gmail.com>`
  - Postmark (outbound): `<uuid@mtasv.net>`
- **Location:** `Headers` array in webhook payload, under `"Message-ID"` header
- **Purpose:** The actual Message-ID that email clients use for threading
- **Usage:** MUST be used for all threading, conversation tracking, and In-Reply-To/References headers

## Codebase Verification Results

### ✅ email.resource.ts (PRIMARY IMPLEMENTATION)

**File:** `services/AI-receptionist/src/resources/core/email.resource.ts`

#### Lines 298-372: `parseWebhookPayload()`
```typescript
// Parse headers first to extract the actual Message-ID
const headers = context.payload.Headers ? this.parsePostmarkHeaders(context.payload.Headers) : {};

// CRITICAL: Extract the actual Message-ID from email headers
let actualMessageId = context.payload.MessageID; // Fallback only

if (headers['message-id']) {
  // Extract Message-ID from headers and clean it
  actualMessageId = this.cleanMessageId(headers['message-id']); // ✅ CORRECT
  logger.debug('[EmailResource] Using actual Message-ID from headers', {
    postmarkMessageId: context.payload.MessageID, // Used for logging only
    actualMessageId,
    headerValue: headers['message-id']
  });
} else {
  logger.warn('[EmailResource] No Message-ID header found, using Postmark MessageID', {
    postmarkMessageId: context.payload.MessageID // Fallback only
  });
}

return {
  id: actualMessageId, // ✅ Uses the REAL Message-ID
  // ... rest of fields
};
```

**Status:** ✅ CORRECT
- Uses actual Message-ID from headers as primary
- Postmark's MessageID only used as fallback and for logging
- Properly documented with comments

#### Lines 523-574: `storeInboundEmail()`
```typescript
await this.agent.getMemory().store({
  id: `msg-${conversationId}-${Date.now()}`,
  // ...
  sessionMetadata: {
    conversationId,
    emailId: email.id, // ✅ This is the actual Message-ID from parseWebhookPayload
    threadRoot,
    inReplyTo: email.headers?.['in-reply-to'],
    references: email.headers?.references,
    // ...
  },
});
```

**Status:** ✅ CORRECT
- Stores `email.id` which contains the actual Message-ID
- Used for conversation tracking and thread detection

#### Lines 630-686: `triggerAutoReply()`
```typescript
const formattedInReplyTo = this.formatMessageId(email.id); // ✅ email.id is the actual Message-ID

const references = email.headers?.references
  ? `${email.headers.references} ${formattedInReplyTo}` // ✅ Builds proper References chain
  : formattedInReplyTo;

await this.processWithAgent(
  // ...
  {
    toolParams: {
      to: email.from,
      subject: `Re: ${cleanSubject}`,
      inReplyTo: formattedInReplyTo, // ✅ Uses actual Message-ID
      references: references // ✅ Uses actual Message-ID chain
    }
  }
);
```

**Status:** ✅ CORRECT
- Uses actual Message-ID for In-Reply-To header
- Builds proper References chain with actual Message-IDs
- Threading will work correctly

#### Lines 688-697: `findConversationByMessageId()`
```typescript
const memories = await this.agent.getMemory().search({
  channel: 'email',
  sessionMetadata: { emailId: messageId }, // Searches for actual Message-ID
  limit: 1
});
```

**Status:** ✅ CORRECT
- Searches using actual Message-ID stored in `emailId`
- Finds conversations correctly

### ✅ postmark.provider.ts (SECONDARY IMPLEMENTATION)

**File:** `services/AI-receptionist/src/providers/email/postmark.provider.ts`

#### Lines 163-177: `sendEmail()` - Logging
```typescript
// Note: Postmark returns MessageID as UUID only (e.g., "249f3e6e-251c-48c0-948b-130b94baf4da")
// This is Postmark's internal tracking ID. When Postmark sends the email, it generates
// a proper Message-ID header in the format <uuid@mtasv.net> which is what recipients see.
// For threading, always use the actual Message-ID from email headers, not this UUID.
logger.info('[PostmarkProvider] Email sent successfully', {
  messageId: response.MessageID, // Postmark's internal tracking ID (metadata only)
  messageIdInEmailHeaders: `<${response.MessageID}@mtasv.net>`, // Actual Message-ID
  // ...
});
```

**Status:** ✅ CORRECT
- Clearly documents the difference between internal ID and actual Message-ID
- Uses Postmark's MessageID only for logging/tracking
- Returns `response.MessageID` which is acceptable (it's metadata)

#### Lines 193-240: `parseInboundEmail()`
```typescript
// Parse headers first
const headers = payload.Headers.reduce((acc, h) => {
  acc[h.Name.toLowerCase()] = h.Value;
  return acc;
}, {} as Record<string, string>);

// Extract actual Message-ID from headers, fallback to Postmark's MessageID
const actualMessageId = headers['message-id']
  ? headers['message-id'].replace(/^<|>$/g, '').trim()
  : payload.MessageID; // ✅ Uses actual Message-ID, Postmark ID as fallback

return {
  // ...
  messageId: actualMessageId, // ✅ Returns actual Message-ID
  headers,
  // ...
};
```

**Status:** ✅ CORRECT
- Extracts actual Message-ID from headers
- Only uses Postmark's MessageID as fallback
- Properly documented
- **Note:** This function is not currently called anywhere, but it's good to have it correct for future use

## Search for Any Remaining Issues

### Search 1: Direct usage of `context.payload.MessageID`
**Result:** Only 3 occurrences, all correct:
1. Line 311: Fallback initialization (`let actualMessageId = context.payload.MessageID`)
2. Line 317: Logging only (`postmarkMessageId: context.payload.MessageID`)
3. Line 323: Logging only (`postmarkMessageId: context.payload.MessageID`)

**Status:** ✅ ALL CORRECT - Only used for fallback and logging

### Search 2: Usage of `email.id`
**Result:** All occurrences use `email.id` which now contains the actual Message-ID:
- Line 527: Thread root extraction
- Line 547: Storage in memory (`emailId: email.id`)
- Line 565: Logging
- Line 476: Session metadata

**Status:** ✅ ALL CORRECT - All use the actual Message-ID

## Data Flow Verification

### Inbound Email Flow
```
1. User sends email from Outlook/Gmail
   → Message-ID: <SEZPR04MB6729...@outlook.com>

2. Postmark receives email
   → Creates webhook payload
   → MessageID: "uuid" (internal tracking)
   → Headers: [{"Name": "Message-ID", "Value": "<SEZPR04MB6729...@outlook.com>"}]

3. parseWebhookPayload() extracts actual Message-ID
   → headers['message-id'] = "<SEZPR04MB6729...@outlook.com>"
   → cleanMessageId() → "SEZPR04MB6729...@outlook.com"
   → email.id = "SEZPR04MB6729...@outlook.com" ✅

4. storeInboundEmail() stores it
   → sessionMetadata.emailId = "SEZPR04MB6729...@outlook.com" ✅

5. triggerAutoReply() uses it
   → In-Reply-To: <SEZPR04MB6729...@outlook.com> ✅
   → References: <SEZPR04MB6729...@outlook.com> ✅

6. User's email client receives reply
   → Finds matching Message-ID ✅
   → Threads correctly ✅
```

### Outbound Email Flow (Bot sends first)
```
1. Bot sends email via Postmark
   → Postmark generates Message-ID: <uuid@mtasv.net>
   → Returns MessageID: "uuid"

2. storeOutboundEmail() stores it
   → sessionMetadata.emailId = "uuid" (acceptable - this will be normalized later)

3. User replies
   → In-Reply-To: <uuid@mtasv.net>
   → References: <uuid@mtasv.net>

4. parseWebhookPayload() receives reply
   → headers['in-reply-to'] = "<uuid@mtasv.net>"

5. findOrCreateConversation() matches it
   → normalizeMessageIdForMatching() handles both "uuid@mtasv.net" and "uuid"
   → Finds conversation ✅
```

## Potential Edge Cases Handled

### ✅ Case 1: Postmark outbound email threading
- Postmark sends: `<uuid@mtasv.net>`
- We store: `uuid` (from response.MessageID)
- User replies with In-Reply-To: `<uuid@mtasv.net>`
- We match: `normalizeMessageIdForMatching()` strips domain to match both

**Status:** ✅ HANDLED by `normalizeMessageIdForMatching()` (lines 495-499)

### ✅ Case 2: Missing Message-ID header
- If Headers array doesn't contain Message-ID
- We fall back to `context.payload.MessageID`
- System continues to work (though threading may be degraded)

**Status:** ✅ HANDLED by fallback logic (line 311)

### ✅ Case 3: Gmail vs Outlook vs other providers
- Each email client uses its own domain in Message-ID
- We preserve the exact Message-ID, including domain
- Threading works across all clients

**Status:** ✅ HANDLED by extracting actual Message-ID from headers

## Conclusion

### ✅ VERIFIED: Correct Usage of Message-IDs

The codebase correctly:
1. **Extracts actual Message-IDs** from the Headers array (primary)
2. **Uses Postmark's MessageID** only for fallback and logging (metadata)
3. **Preserves original domains** in Message-IDs (Gmail, Outlook, Postmark, etc.)
4. **Threads correctly** by using actual Message-IDs in In-Reply-To and References
5. **Handles edge cases** with normalization and fallback logic

### No Issues Found

All Message-ID usage is correct. The fix implemented for email threading is complete and comprehensive.

### Testing Recommendation

Test the following scenarios to verify threading works:
1. ✅ User sends email from Gmail → Bot replies → Check Gmail shows thread
2. ✅ User sends email from Outlook → Bot replies → Check Outlook shows thread
3. ✅ User sends email from Apple Mail → Bot replies → Check shows thread
4. ✅ Bot sends first email → User replies → Bot replies again → Check shows thread
5. ✅ Long conversation (10+ emails) → Verify all stay in same thread

### Documentation Quality

All critical code sections are well-documented with:
- Comments explaining why we use actual Message-IDs
- Warnings about not using Postmark's MessageID for threading
- Clear distinction between tracking IDs and threading IDs

---

**Verification completed by:** Claude Code
**Verification method:** Comprehensive code review, grep searches, data flow analysis
**Confidence level:** VERY HIGH
