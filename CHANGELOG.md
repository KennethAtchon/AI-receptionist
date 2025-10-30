# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2025-10-30

### Changed
- **BREAKING**: Removed `signature` parameter from `handleEmailWebhook()` method
  - Postmark does NOT provide webhook signatures for inbound emails
  - Updated method signature: `handleEmailWebhook(payload: any)` (was `handleEmailWebhook(payload: any, signature?: string)`)
  - Updated documentation to reflect Postmark's actual security model

### Removed
- Removed unused `verifyWebhookSignature()` method from WebhookRouter
- Removed Postmark signature validation logic (never existed in Postmark's API)

### Documentation
- Added security notes explaining Postmark's authentication methods:
  - Basic HTTP Authentication (recommended)
  - HTTPS enforcement
  - IP whitelisting
- Updated JSDoc comments in client.ts and webhook-router.ts
- Updated example code to remove signature handling

## [0.1.2] - Previous Release

Previous changes not documented.
