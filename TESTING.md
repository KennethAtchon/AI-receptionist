# Testing Guide for AI Receptionist SDK

## Overview

This SDK includes a comprehensive test suite with **80%+ coverage target** following industry best practices for SDK development.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

## Test Statistics

| Component | Test File | Coverage Target |
|-----------|-----------|----------------|
| ToolRegistry | `tools/__tests__/registry.test.ts` | 100% |
| ConversationService | `services/__tests__/conversation.service.test.ts` | 100% |
| ToolExecutionService | `services/__tests__/tool-execution.service.test.ts` | 95%+ |
| InMemoryConversationStore | `storage/__tests__/in-memory-conversation.store.test.ts` | 100% |
| AIReceptionist Client | `__tests__/client.test.ts` | 80%+ |
| CallsResource | `resources/__tests__/calls.resource.test.ts` | 90%+ |
| SMSResource | `resources/__tests__/sms.resource.test.ts` | 90%+ |
| EmailResource | `resources/__tests__/email.resource.test.ts` | 90%+ |

## Test Coverage

### Current Coverage Breakdown

```
Statements   : 80%+
Branches     : 80%+
Functions    : 80%+
Lines        : 80%+
```

### View Coverage Report

After running `npm run test:coverage`, open:
```
ai-receptionist/coverage/lcov-report/index.html
```

## Test Architecture

### Unit Tests
Individual component testing with mocked dependencies.

**Example:** Testing ToolRegistry in isolation
```typescript
describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should_register_new_tool_successfully', () => {
    registry.register(mockBookingTool);
    expect(registry.count()).toBe(1);
  });
});
```

### Integration Tests
Testing multiple components working together.

**Example:** Complete conversation workflow
```typescript
it('should_handle_conversation_from_start_to_finish', async () => {
  // Create conversation
  const conversation = await service.create({...});

  // Add messages
  await service.addMessage(conversation.id, {...});

  // Complete conversation
  await service.complete(conversation.id);

  // Verify state
  expect(conversation.status).toBe('completed');
});
```

## Test Organization

```
src/
├── __tests__/                 # Client & shared tests
│   ├── setup.ts              # Global test configuration
│   ├── client.test.ts        # Main client tests
│   ├── fixtures/             # Test data
│   │   ├── agents.ts         # Mock agent configs
│   │   ├── tools.ts          # Mock tool definitions
│   │   └── conversations.ts  # Mock conversations
│   ├── mocks/                # Mock implementations
│   │   └── providers.ts      # Provider mocks
│   ├── integration/          # Integration tests
│   │   └── agent-workflow.test.ts
│   └── README.md            # Test documentation
├── services/__tests__/       # Service tests
├── tools/__tests__/          # Tool system tests
├── storage/__tests__/        # Storage tests
└── resources/__tests__/      # Resource tests
```

## Writing Tests

### 1. Follow Naming Convention

Use: `should_expectedBehavior_when_condition`

```typescript
✅ should_create_conversation_successfully
✅ should_throw_error_when_agent_config_missing
❌ test_conversation_creation
❌ it_works
```

### 2. Use AAA Pattern

```typescript
it('should_execute_tool_successfully', async () => {
  // Arrange
  const params = { date: '2025-01-20' };

  // Act
  const result = await service.execute('book_appointment', params);

  // Assert
  expect(result.success).toBe(true);
});
```

### 3. Use Fixtures

```typescript
import { mockAgentSarah, mockBookingTool } from './__tests__/fixtures';

it('should_use_fixture_data', () => {
  registry.register(mockBookingTool);
  expect(registry.get('book_appointment')).toBeDefined();
});
```

### 4. Mock External Dependencies

```typescript
jest.mock('../providers/ai/openai.provider');
jest.mock('../providers/communication/twilio.provider');
```

### 5. Test Error Cases

```typescript
it('should_handle_tool_execution_errors_gracefully', async () => {
  const result = await service.execute('failing_tool', {});

  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
});
```

## Available Test Fixtures

### Agent Fixtures
```typescript
import {
  mockAgentSarah,      // Sales agent
  mockAgentBob,        // Support agent
  mockAgentTech,       // Technical agent
} from './__tests__/fixtures';
```

### Tool Fixtures
```typescript
import {
  mockBookingTool,     // Appointment booking
  mockWeatherTool,     // Weather information
  mockCalendarTool,    // Calendar check
  mockFailingTool,     // For error testing
} from './__tests__/fixtures';
```

### Conversation Fixtures
```typescript
import {
  mockConversationCall,      // Active call
  mockConversationSMS,       // Completed SMS
  mockConversationCompleted, // Completed call
  mockConversationFailed,    // Failed conversation
} from './__tests__/fixtures';
```

## Mock Providers

Located in `src/__tests__/mocks/providers.ts`:

```typescript
import {
  MockAIProvider,
  MockTwilioProvider,
  MockCalendarProvider,
} from './__tests__/mocks/providers';
```

## Running Specific Tests

### By File
```bash
npm test -- client.test
npm test -- registry.test
```

### By Test Name
```bash
npm test -- --testNamePattern="should_register_new_tool"
```

### By Describe Block
```bash
npm test -- --testNamePattern="ToolRegistry"
```

### Watch Specific File
```bash
npm test -- --watch registry.test
```

## Debugging Tests

### VS Code
1. Set breakpoint in test
2. Right-click test
3. Select "Debug Test"

### Console Logging
```typescript
it('should_debug_test', () => {
  console.log('Debug info:', data);
  expect(data).toBeDefined();
});
```

### Verbose Output
```bash
npm test -- --verbose
```

## CI/CD Integration

Tests run automatically:
- ✅ Pre-commit (via husky - if configured)
- ✅ Pull requests
- ✅ Before publish (`prepublishOnly` script)

### CI Command
```bash
npm run test:ci
```

This runs tests with:
- Coverage report
- CI optimizations
- Limited workers (2)

## Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

Tests will **fail** if coverage drops below 80%.

## Best Practices

### ✅ Do

- **Write tests early** - Follow TDD when possible
- **Test behavior, not implementation** - Focus on what, not how
- **Use descriptive names** - Tests serve as documentation
- **Keep tests independent** - No shared state
- **Test edge cases** - Empty inputs, nulls, boundaries
- **Mock external dependencies** - No real API calls
- **Clean up after tests** - Use beforeEach/afterEach

### ❌ Don't

- **Skip error tests** - Always test failure paths
- **Test third-party code** - Only test your code
- **Write flaky tests** - Tests should be deterministic
- **Use hardcoded values** - Use fixtures
- **Ignore coverage** - Aim for 80%+
- **Test implementation details** - Test public APIs

## Common Test Patterns

### Testing Async Code
```typescript
it('should_handle_async_operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Errors
```typescript
it('should_throw_error_when_invalid', async () => {
  await expect(
    invalidOperation()
  ).rejects.toThrow('Expected error');
});
```

### Testing Callbacks
```typescript
it('should_call_callback', async () => {
  const callback = jest.fn();
  service.on('event', callback);

  await service.triggerEvent();

  expect(callback).toHaveBeenCalledTimes(1);
});
```

### Testing with Mocks
```typescript
it('should_use_mock', async () => {
  mockService.method.mockResolvedValue(mockData);

  const result = await component.doSomething();

  expect(mockService.method).toHaveBeenCalled();
});
```

## Troubleshooting

### Tests Failing

1. **Check imports** - Ensure correct paths
2. **Check mocks** - Verify mock configuration
3. **Check async** - Use async/await properly
4. **Check setup** - Verify beforeEach runs

### Coverage Too Low

1. Run coverage report: `npm run test:coverage`
2. Open `coverage/lcov-report/index.html`
3. Find uncovered lines
4. Write tests for uncovered code

### Slow Tests

1. Check for real API calls (should be mocked)
2. Use `--maxWorkers=1` for debugging
3. Profile with `--verbose`

## Additional Resources

- [Full Test Documentation](./src/__tests__/README.md)
- [Jest Documentation](https://jestjs.io/)
- [TypeScript Jest Guide](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://testingjavascript.com/)

## Need Help?

1. Check [Test README](./src/__tests__/README.md)
2. Look at existing tests for patterns
3. Review Jest documentation
4. Open an issue

---

**Remember**: Good tests make refactoring safe and documentation clear!
