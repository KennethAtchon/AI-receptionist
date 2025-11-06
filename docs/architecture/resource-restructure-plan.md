# Resource Structure Reorganization Plan

## Current Structure Analysis

### Current Location
```
src/
├── resources/
│   └── core/
│       ├── email.resource.ts
│       ├── sms.resource.ts
│       └── voice.resource.ts
└── utils/
    ├── email/          ← Email-specific utilities
    ├── sms/            ← SMS-specific utilities
    ├── voice/          ← Voice-specific utilities
    ├── logger.ts       ← General utility
    └── RateLimiter.ts  ← General utility
```

### Issues with Current Structure
1. **Poor Cohesion**: Channel-specific utilities are separated from their resources
2. **Unclear Ownership**: Utils folder suggests general utilities, but these are resource-specific
3. **Long Import Paths**: Resources must import from `../../utils/email` instead of co-located files
4. **Maintenance Difficulty**: Harder to see what's related to each resource

## Recommended Structure

### Option 1: Channel-Based Folders (Recommended)
```
src/
├── resources/
│   ├── email/
│   │   ├── email.resource.ts
│   │   └── processors/
│   │       ├── ConversationMatcher.ts
│   │       ├── EmailAllowlist.ts
│   │       ├── EmailAutoReplyDetector.ts
│   │       ├── EmailContentManager.ts
│   │       ├── EmailContentParser.ts
│   │       ├── EmailHeaderUtils.ts
│   │       ├── EmailPayloadParser.ts
│   │       ├── EmailStorage.ts
│   │       └── index.ts
│   ├── sms/
│   │   ├── sms.resource.ts
│   │   └── processors/
│   │       ├── ConversationMatcher.ts
│   │       ├── PhoneNumberUtils.ts
│   │       ├── SMSAllowlist.ts
│   │       ├── SMSAutoReplyDetector.ts
│   │       ├── SMSPayloadParser.ts
│   │       ├── SMSRateLimiter.ts
│   │       ├── SMSStorage.ts
│   │       └── index.ts
│   ├── voice/
│   │   ├── voice.resource.ts
│   │   └── processors/
│   │       ├── CallerMatcher.ts
│   │       ├── CallPayloadParser.ts
│   │       ├── CallRateLimiter.ts
│   │       ├── CallStorage.ts
│   │       ├── SpamDetector.ts
│   │       ├── TwiMLGenerator.ts
│   │       └── index.ts
│   ├── text/
│   │   └── text.resource.ts
│   ├── base.resource.ts
│   ├── index.ts
│   └── initialization.ts
└── utils/
    ├── logger.ts
    └── RateLimiter.ts  (general, not channel-specific)
```

### Option 2: Keep Core Folder, Add Processors Subfolder
```
src/
├── resources/
│   ├── core/
│   │   ├── email.resource.ts
│   │   ├── email.processors.ts  (all email processors in one file)
│   │   ├── sms.resource.ts
│   │   ├── sms.processors.ts
│   │   ├── voice.resource.ts
│   │   └── voice.processors.ts
│   ├── base.resource.ts
│   ├── index.ts
│   └── initialization.ts
```

**Not Recommended**: This would create very large files.

### Option 3: Keep Current Structure
**Status**: Current structure works but is less ideal

## Migration Steps

### Step 1: Create New Folder Structure
1. Create `resources/email/processors/`
2. Create `resources/sms/processors/`
3. Create `resources/voice/processors/`

### Step 2: Move Files
```bash
# Email
mv src/utils/email/* src/resources/email/processors/

# SMS
mv src/utils/sms/* src/resources/sms/processors/

# Voice
mv src/utils/voice/* src/resources/voice/processors/
```

### Step 3: Move Resource Files
```bash
mv src/resources/core/email.resource.ts src/resources/email/
mv src/resources/core/sms.resource.ts src/resources/sms/
mv src/resources/core/voice.resource.ts src/resources/voice/
mv src/resources/core/text.resource.ts src/resources/text/
```

### Step 4: Update Imports

#### In `email.resource.ts`:
```typescript
// Before
import {
  EmailAllowlist,
  ConversationMatcher,
  // ...
} from '../../utils/email';

// After
import {
  EmailAllowlist,
  ConversationMatcher,
  // ...
} from './processors';
```

#### In `sms.resource.ts`:
```typescript
// Before
import {
  SMSAllowlist,
  ConversationMatcher,
  // ...
} from '../../utils/sms';

// After
import {
  SMSAllowlist,
  ConversationMatcher,
  // ...
} from './processors';
```

#### In `voice.resource.ts`:
```typescript
// Before
import {
  CallPayloadParser,
  TwiMLGenerator,
  // ...
} from '../../utils/voice';

// After
import {
  CallPayloadParser,
  TwiMLGenerator,
  // ...
} from './processors';
```

### Step 5: Update Exports

#### `resources/email/index.ts`:
```typescript
export { EmailResource } from './email.resource';
export * from './processors';
```

#### `resources/sms/index.ts`:
```typescript
export { SMSResource } from './sms.resource';
export * from './processors';
```

#### `resources/voice/index.ts`:
```typescript
export { VoiceResource } from './voice.resource';
export * from './processors';
```

### Step 6: Update Resource Initialization

#### `resources/initialization.ts`:
```typescript
// Update imports
import { EmailResource } from './email';
import { SMSResource } from './sms';
import { VoiceResource } from './voice';
import { TextResource } from './text';
```

### Step 7: Update Main Exports

#### `resources/index.ts`:
```typescript
export * from './email';
export * from './sms';
export * from './voice';
export * from './text';
export * from './base.resource';
export * from './initialization';
```

### Step 8: Update Any Other Imports

Search for imports from `utils/email`, `utils/sms`, `utils/voice` and update them:
```bash
# Find all imports
grep -r "from.*utils/(email|sms|voice)" src/

# Update to new paths
```

## Benefits of New Structure

1. **Better Cohesion**: Related code is co-located
2. **Clearer Ownership**: Each resource owns its processors
3. **Easier Navigation**: Find email-related code in one place
4. **Simpler Imports**: Relative imports instead of cross-folder imports
5. **Better Scalability**: Easy to add new resources following the same pattern
6. **Clearer Utils Folder**: Only truly general utilities remain

## Considerations

### Shared Utilities
If any utilities are shared between channels:
- Create `resources/shared/` for shared processors
- Or keep in `utils/` if truly general

### Backward Compatibility
If you need to maintain backward compatibility:
- Keep old exports in `utils/email/index.ts` that re-export from new location
- Add deprecation warnings
- Remove after migration period

## Alternative: Keep Utils but Rename

If you prefer to keep current structure but make it clearer:

```
src/
├── resources/
│   └── core/
│       ├── email.resource.ts
│       ├── sms.resource.ts
│       └── voice.resource.ts
└── processors/  ← Rename from utils, separate from general utils
    ├── email/
    ├── sms/
    └── voice/
└── utils/  ← Only general utilities
    ├── logger.ts
    └── RateLimiter.ts
```

However, this still doesn't provide the same level of cohesion as co-locating with resources.

## Recommendation

**Choose Option 1** - Channel-based folders with processors subfolder. This provides:
- Best cohesion
- Clear ownership
- Easy to extend
- Follows domain-driven design principles

