# Test Suite Documentation

Comprehensive test suite for the AI Receptionist SDK following industry best practices.

## Test Structure

```
src/__tests__/
├── setup.ts                    # Global test setup and utilities
├── client.test.ts             # Main client tests
├── fixtures/                   # Test data and mocks
│   ├── agents.ts              # Mock agent configurations
│   ├── tools.ts               # Mock tool definitions
│   ├── conversations.ts       # Mock conversation data
│   └── index.ts              # Centralized exports
├── mocks/                     # Mock implementations
│   └── providers.ts          # Mock provider implementations
└── integration/              # Integration tests
    └── agent-workflow.test.ts # End-to-end workflows

src/services/__tests__/
├── conversation.service.test.ts    # Conversation management tests

src/tools/__tests__/
└── registry.test.ts               # Tool registry tests

src/storage/__tests__/
└── in-memory-conversation.store.test.ts  # Storage tests

src/resources/__tests__/
├── calls.resource.test.ts         # Call resource tests
├── sms.resource.test.ts           # SMS resource tests
└── email.resource.test.ts         # Email resource tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Specific Test File
```bash
npm test -- client.test
```

### Specific Test Suite
```bash
npm test -- --testNamePattern="ToolRegistry"
```

## Test Naming Convention

We follow the pattern: `should_expectedBehavior_when_condition`

Examples:
- `should_create_conversation_successfully`
- `should_throw_error_when_agent_config_missing`
- `should_filter_by_channel_when_specified`

This makes tests self-documenting and easy to understand.

## Test Categories

### Unit Tests
Test individual components in isolation with mocked dependencies.

**Location:** Component-specific `__tests__` directories

**Examples:**
- `ToolRegistry` - Tool registration and execution
- `ConversationService` - Conversation management
- `InMemoryConversationStore` - Storage operations

### Integration Tests
Test multiple components working together.

**Location:** `src/__tests__/integration/`

**Examples:**
- Complete conversation lifecycle
- Multi-agent scenarios
- Tool execution workflows

## Test Fixtures

Reusable test data is centralized in `src/__tests__/fixtures/`:

### Agents
```typescript
import { mockAgentSarah, mockAgentBob } from './fixtures';
```

### Tools
```typescript
import { mockBookingTool, mockWeatherTool } from './fixtures';
```

### Conversations
```typescript
import { mockConversationCall, mockConversationSMS } from './fixtures';
```

## Mocking Strategy

### Provider Mocks
External providers (Twilio, OpenAI, etc.) are mocked to:
- Avoid API calls during tests
- Ensure consistent test results
- Speed up test execution

Example:
```typescript
jest.mock('../../providers/ai/openai.provider');
```

### Custom Mocks
Mock implementations in `src/__tests__/mocks/` provide controlled behavior for testing.

## Coverage Goals

Target coverage: **80%+** for core functionality

Key areas:
- ✅ Tool Registry: 100%
- ✅ Conversation Service: 100%
- ✅ Tool Execution Service: 95%+
- ✅ Storage: 100%
- ✅ Resources: 90%+
- ⚠️ Client: 80%+ (lazy loading makes some paths harder to test)

## Writing New Tests

### 1. Create Test File
Follow the convention: `component-name.test.ts`

### 2. Import Dependencies
```typescript
import { Component } from '../component';
import { mockData } from '../__tests__/fixtures';
```

### 3. Structure Tests
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should_do_something_when_condition', () => {
      // Arrange
      const input = ...;

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### 4. Use beforeEach for Setup
```typescript
beforeEach(() => {
  component = new Component();
  mockService = createMockService();
});
```

### 5. Test Edge Cases
- Empty inputs
- Invalid inputs
- Null/undefined values
- Boundary conditions
- Error scenarios

## Best Practices

### ✅ Do
- Write descriptive test names
- Test one thing per test
- Use fixtures for common data
- Mock external dependencies
- Test error cases
- Test edge cases
- Keep tests independent
- Clean up after tests

### ❌ Don't
- Make tests depend on each other
- Use hardcoded values (use fixtures)
- Test implementation details
- Skip error scenarios
- Ignore edge cases
- Write overly complex tests
- Test third-party libraries

## Common Patterns

### Testing Async Operations
```typescript
it('should_complete_async_operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Errors
```typescript
it('should_throw_error_when_invalid', async () => {
  await expect(
    function()
  ).rejects.toThrow('Expected error message');
});
```

### Testing Events/Callbacks
```typescript
it('should_call_callback_on_event', async () => {
  const callback = jest.fn();
  component.on('event', callback);

  await component.triggerEvent();

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith(expectedData);
});
```

### Testing with Mocks
```typescript
it('should_use_mocked_service', async () => {
  mockService.method.mockResolvedValue(mockData);

  const result = await component.doSomething();

  expect(mockService.method).toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});
```

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="specific test name"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Debug in VS Code
Add breakpoint and use "Debug Jest Test" from the context menu.

## CI/CD Integration

Tests run automatically on:
- Pre-commit (via husky)
- Pull requests
- Pre-publish

Ensure all tests pass before:
- Committing code
- Creating PRs
- Publishing releases

## Maintenance

### Regular Tasks
- Update fixtures when types change
- Add tests for new features
- Refactor tests when refactoring code
- Review coverage reports
- Remove obsolete tests

### When Coverage Drops
1. Identify uncovered code
2. Add targeted tests
3. Verify coverage improvement
4. Document why if some code is intentionally untested

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [TypeScript Testing](https://basarat.gitbook.io/typescript/intro-1/jest)

## Questions?

For test-related questions:
1. Check this README
2. Look at existing tests for patterns
3. Review Jest documentation
4. Ask the team
