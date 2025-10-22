## Calendar Service Refactor Plan: Generalize Providers and Move Business Logic Out of `google.provider.ts`

### Goals
- **Generalize calendar providers**: Providers act as thin infrastructure adapters, not business logic containers.
- **Introduce a `CalendarService`**: Centralize scheduling business rules (availability, slot generation, buffers, booking) independent of provider specifics.
- **Introduce a consistent provider pattern**: Move business logic out of all providers (including Twilio) into services.
 - **Explicitly accept breaking changes**: No backward compatibility; remove-and-replace with new names/keys (no deprecation window).
- **Enable multi-provider support**: Make it straightforward to add Microsoft/CalDAV/Apple later.

### Current State (Summary)
- `GoogleProvider` currently mixes adapter concerns with early signs of business logic (e.g., `getAvailableSlots`).
- Providers are registered via `ProviderRegistry` and validated with `GoogleCalendarValidator`.
- Standard tools have placeholder calendar logic and do not yet delegate to a dedicated service.

### Target Architecture
- **Hexagonal boundary**:
  - Domain/Application: `CalendarService` (business rules, domain types, policies)
  - Infrastructure: `ICalendarProvider` implementations (`GoogleProvider`, future `MicrosoftCalendarProvider`, etc.)
- **Provider responsibilities**: Authentication, low-level API calls, error normalization, and health checks only.
- **Service responsibilities**: Availability computation, working hours and buffers, meeting policies, conflict detection, booking and lifecycle flows.

Additionally, for communication providers:
- Domain/Application: `CallService` (voice orchestration) and a new `MessagingService` (SMS templating, throttling, compliance).
- Infrastructure: `ICommunicationProvider` implementations (`TwilioProvider`, etc.).

### Provider Design Principles (All Providers)
- Thin adapters only; no business rules (no slotting, no policy decisions, no templating).
- Normalize remote errors to shared categories and avoid leaking raw SDK errors.
- Implement `initialize`, `healthCheck`, and minimal primitives that map 1:1 to remote APIs.
- Retries/idempotency/caching handled in services; providers keep calls straightforward.
- Structured logging without PII; consistent registry keys (e.g., `twilio`, `google`).

### Interfaces and Contracts
1) Provider abstraction (minimal, tech-agnostic)
```ts
// src/types/calendar.ts (new)
export interface ICalendarProvider {
  readonly name: string;     // e.g., 'google-calendar'
  readonly type: 'calendar';

  initialize(): Promise<void>;
  healthCheck(): Promise<boolean>;

  // Low-level primitives (no business policy)
  listFreeBusy(params: {
    calendarId: string;
    timeMin: Date;
    timeMax: Date;
    timeZone?: string;
  }): Promise<Array<{ start: Date; end: Date }>>; // busy blocks

  createEvent(params: {
    calendarId: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: { email: string; optional?: boolean }[];
    timeZone?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }>;

  updateEvent?(params: { calendarId: string; eventId: string; changes: any }): Promise<void>;
  deleteEvent?(params: { calendarId: string; eventId: string }): Promise<void>;
}
```

2) Service API (business-oriented)
```ts
// src/services/calendar.service.ts (new)
export interface AvailabilityRule {
  timeZone: string;               // canonical tz for calculations
  workingHours: Array<{ day: number; start: string; end: string }>; // 0-6 Sun-Sat
  slotDurationMinutes: number;    // e.g., 30, 45, 60
  minLeadMinutes?: number;        // e.g., 120 to prevent too-soon bookings
  bufferBeforeMinutes?: number;   // e.g., 10
  bufferAfterMinutes?: number;    // e.g., 10
  allowOverlapping?: boolean;     // default false
}

export interface BookingRequest {
  calendarId: string;
  title: string;
  start: Date;                    // in tz per rule.timeZone
  end: Date;
  description?: string;
  attendees?: { email: string; optional?: boolean }[];
  metadata?: Record<string, unknown>;
}

export class CalendarService {
  constructor(private readonly providerResolver: () => Promise<ICalendarProvider>) {}

  async getAvailableSlots(params: {
    calendarId: string;
    rangeStart: Date;             // inclusive
    rangeEnd: Date;               // exclusive
    rule: AvailabilityRule;
  }): Promise<Date[]> { /* compute slots from free/busy + rules */ }

  async book(params: BookingRequest): Promise<{ id: string }> { /* idempotent booking with conflict checks */ }

  async findNextAvailable(params: {
    calendarId: string;
    after: Date;
    rule: AvailabilityRule;
  }): Promise<Date | null> { /* search forward using slot generation */ }
}
```

3) Communication provider and services (Twilio)
```ts
// src/types/communication.ts (new)
export interface ICommunicationProvider {
  readonly name: string;            // e.g., 'twilio'
  readonly type: 'communication';
  initialize(): Promise<void>;
  healthCheck(): Promise<boolean>;

  makeCall(to: string, options: CallOptions): Promise<string>;   // returns callSid
  sendSMS(to: string, body: string, options?: SMSOptions): Promise<string>; // returns messageSid
}

// src/services/messaging.service.ts (new)
export class MessagingService {
  constructor(private readonly providerResolver: () => Promise<ICommunicationProvider>) {}

  async sendTemplatedSMS(params: {
    to: string;
    templateId: string;
    variables: Record<string, string>;
    track?: boolean;
  }): Promise<{ id: string }> { /* templating, rate limits, opt-out handling */ }
}
```

### Key Design Decisions
- **Providers expose primitives** (`listFreeBusy`, `createEvent`) so all policy (buffers, slotting) lives in `CalendarService`.
- **Time zones are explicit** in all service inputs/outputs; conversions are centralized in the service.
- **Error mapping**: Providers normalize remote errors to a small set (AuthError, NotFound, RateLimited, Transient, Validation); the service raises domain errors (e.g., `DoubleBookingError`, `OutOfHoursError`).
- **Idempotency**: `book` accepts an optional idempotency key (via `metadata`) and the provider should persist or simulate idempotency when available.
- **Caching**: Optional short-lived cache for `listFreeBusy` windows to reduce API calls during slot searches.
- **Observability**: Service emits structured logs and timing metrics; providers include request IDs where available.

### Changes to Existing Code
1) `GoogleProvider` (rename):
   - File: `src/providers/calendar/google.provider.ts`
   - Class: `GoogleProvider`
   - Registry key: `'google'` (align with `'twilio'`)
   - Remove `getAvailableSlots` entirely (moved to service)
   - Implement `listFreeBusy` mapping to Google FreeBusy API
   - Keep `createEvent` thin (DTO → Google event)

2) Types:
   - Add `ICalendarProvider`, `AvailabilityRule`, `BookingRequest` to `src/types` (or a new `src/types/calendar.ts` and re-export from `src/types/index.ts`).

3) Service:
   - Add `CalendarService` in `src/services/calendar.service.ts`.
   - Accept a resolver that pulls a provider from `ProviderRegistry` (lazy + validated).

3b) Communication Services (Twilio):
   - Keep `TwilioProvider` minimal; ensure no templating or policy logic remains.
   - Add `MessagingService` for SMS templating, throttling, opt-out, tracking.
   - Ensure `CallService` retains all voice orchestration and policy.

4) Provider Registry:
   - Register provider under `'google'` (breaking change from `'google-calendar'`).
   - `CalendarService` resolves provider via `registry.get<ICalendarProvider>('google')`.
   - Later: introduce a `CalendarProviderSelector` to support multiple calendars if needed.

4b) Provider Registry (communication):
   - Continue registering `'twilio'` as the communication provider key.
   - `CallService`/`MessagingService` resolve via `registry.get<ICommunicationProvider>('twilio')`.

5) Tools:
   - Update `createCalendarTool` handlers to call `CalendarService` (not provider) for availability and booking.
   - Keep tool schemas the same; only internal wiring changes.

6) Validation:
   - Rename to `GoogleValidator` (optional but recommended for symmetry with `TwilioValidator`).
   - Service relies on validated providers from the registry.

6b) Validation (communication):
   - Keep `TwilioValidator` for format/connection checks; services assume validated providers.

### Breaking Changes (No Backward Compatibility)
- Rename provider file and class:
  - `src/providers/calendar/google-calendar.provider.ts` → `src/providers/calendar/google.provider.ts`
  - `GoogleCalendarProvider` → `GoogleProvider`
- Change registry key from `'google-calendar'` to `'google'`.
- Remove `getAvailableSlots` from the provider entirely.
- Update exports:
  - `src/index.ts` and `src/providers/index.ts` to export `GoogleProvider` from `providers/calendar/google.provider`.
- Update initialization wiring in `src/client.ts` to register `'google'` and import `GoogleProvider` from the new path.
- Update validators:
  - Optionally rename `GoogleCalendarValidator` → `GoogleValidator`; update `src/validation/index.ts` and usages.
- Update all internal imports and tests to the new names and keys.

No compatibility layer:
- No deprecated APIs or aliases will be provided.
- No transitional shims; existing code must update imports, registry keys, and method calls.

Communication changes:
- Introduce `MessagingService` and migrate SMS-related business logic out of `TwilioProvider`.
- Ensure all call orchestration lives in `CallService`; `TwilioProvider` only performs API calls.

### Error Handling Strategy
- Provider error categories: `auth`, `permission`, `quota`, `rate_limit`, `not_found`, `transient`, `validation`.
- Service domain errors: `DoubleBookingError`, `OutOfHoursError`, `PolicyViolationError`, `ConflictError`, `UnavailableError`.
- Map provider categories to domain errors with retry/backoff guidance for `transient`/`rate_limit`.

Communication service errors may include: `ComplianceViolationError`, `RateLimitedError`, `TemplateRenderError`.

### Concurrency, Consistency, Idempotency
- Optional mutex/lock at the service level when computing+booking to prevent race conditions.
- Idempotency key propagation to provider if supported; else maintain a short-term idempotency cache keyed by request hash.

For messaging:
- Optional deduplication for SMS by `(to, templateId, variablesHash)` to avoid duplicates.

### Caching
- Memoize `listFreeBusy` within a short TTL (e.g., 30–120s) per `(calendarId, timeMin, timeMax)` to accelerate slot searches.
- Invalidate on `createEvent`/`updateEvent`/`deleteEvent`.

For messaging:
- Avoid provider-level caching; optionally cache templates or link resolutions in `MessagingService`.

### Observability
- Structured logs with context: calendarId, time window, tz, slot rules, counts.
- Metrics: time-to-first-slot, slots-considered, API latency, error rates.

### Security & Permissions
- Principle of least privilege scopes (read for availability checks, write only when booking).
- Never log PII (attendee emails) unredacted.
- Surface link-based verification for calendars requiring explicit sharing.

### Testing Strategy
- Unit tests for `CalendarService` slot generation (edge cases: DST, boundary times, buffers, overlapping events, multi-day ranges).
- Contract tests for `GoogleProvider` against mocked Google APIs (freebusy, events.insert).
- Integration tests for tools calling `CalendarService` for both call and sms channels.
- Property-based tests for time math (optional) using multiple time zones.

Messaging/Communication:
- Unit tests for `MessagingService` (templating, opt-out, throttling).
- Contract tests for `TwilioProvider` with mocked Twilio SDK (calls/messages).
- Integration tests for `CallService` and `MessagingService` with the registry.

### Rollout Plan
1) Add types (`ICalendarProvider`, availability/booking DTOs).
2) Implement `CalendarService` with `getAvailableSlots`, `book`.
3) Update `GoogleProvider` to implement `listFreeBusy` and use `createEvent` only.
4) Wire `CalendarService` into `standard tools` (calendar tool) and any resource paths.
5) Add tests; ensure coverage at least matches prior behavior.
6) Remove `getAvailableSlots` from the provider immediately (no deprecation period).

Communication phase:
7) Add `ICommunicationProvider` contract (formalize Twilio methods).
8) Implement `MessagingService`; migrate SMS logic from tools/resources into the service.
9) Ensure `CallService` is the single orchestrator for calls; remove any orchestration from `TwilioProvider` if present.
10) Update tools/resources to call `MessagingService` (SMS) and `CallService` (voice) instead of the provider directly.

### Example Usage
```ts
// Construct service with lazy provider resolution via ProviderRegistry
const calendarService = new CalendarService(async () =>
  await providerRegistry.get<ICalendarProvider>('google')
);

const rule: AvailabilityRule = {
  timeZone: 'America/Los_Angeles',
  workingHours: [
    { day: 1, start: '09:00', end: '17:00' }, // Monday
    { day: 2, start: '09:00', end: '17:00' },
    // ...
  ],
  slotDurationMinutes: 60,
  bufferBeforeMinutes: 10,
  bufferAfterMinutes: 10,
  minLeadMinutes: 120,
};

const slots = await calendarService.getAvailableSlots({
  calendarId: 'primary',
  rangeStart: new Date('2025-01-30T00:00:00-08:00'),
  rangeEnd: new Date('2025-01-31T00:00:00-08:00'),
  rule,
});

if (slots.length) {
  await calendarService.book({
    calendarId: 'primary',
    title: 'Demo Call',
    start: slots[0],
    end: new Date(slots[0].getTime() + 60 * 60 * 1000),
    attendees: [{ email: 'customer@example.com' }],
  });
}
```

### Future Extensions
- Multi-calendar support and pooling across calendars.
- Microsoft Graph/CalDAV providers.
- Recurring meetings and prep/buffer windows across recurrences.
- No-meeting days, holidays, and exception calendars.


