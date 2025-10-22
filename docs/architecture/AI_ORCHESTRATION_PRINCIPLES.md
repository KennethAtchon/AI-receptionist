## AI Orchestration Principles

These principles keep the system simple, predictable, and scalable as we evolve the SDK.

- **Choose a single orchestrator**: Either the Agent or the Processor orchestrates. Never both.
  - **Recommended**: Agent + Tools (AI is the sole decider; tools execute side-effects).
  - Alternative: Processor-only orchestration (Processors consult AI and execute providers/tools).

- **AI is the decision-maker**: The orchestrator consults the AI to decide what to do. Tools and providers just execute.

- **Tools are deterministic executors**: Tools should be thin, idempotent handlers wrapping provider calls or domain logic. They should not contain orchestration logic.

- **Providers are pure wrappers**: Providers only wrap external APIs (Twilio, Google Calendar, etc.). No business logic, no orchestration.

- **Resources and Services stay thin**: Resources expose user-facing APIs. Services validate and delegate to the orchestrator. No orchestration in either.

- **Pass tools into the AI call**: Always pass `availableTools` to the AI provider; otherwise function-calling cannot occur.

- **Tool loop pattern**: After each AI chat:
  - If `toolCalls` exist → execute them all → send tool results back to AI → repeat until no more tool calls.
  - If no `toolCalls` → use `content` directly.

- **No duplication of orchestration**: Do not implement similar AI decision loops in multiple places (e.g., Agent and Processor). Centralize it.

- **Observability by default**: Log tool executions and errors; include durations and context. Keep traces for orchestration steps.

### Recommended Architecture (Agent + Tools)

- Resources → Services → Agent.process(...)
- Agent consults AI with `availableTools`
- ToolExecutionService executes tool calls requested by the AI
- Agent asks AI to finalize user-facing text
- Providers are called from tools only

### Alternative Architecture (Processor-only)

- Resources → Services → Processor
- Processor consults AI with `availableTools`
- Processor executes tool calls via ToolExecutionService, then consults AI again with results
- Providers are called from tools (or from processor if strictly necessary)

### Migration Guidance

- If both Agent and Processors are present, pick one and phase out the other.
- Prefer modeling provider-side actions as tools so AI explicitly invokes them.
- Keep tool parameter schemas explicit (JSON Schema) for reliable function-calling.


