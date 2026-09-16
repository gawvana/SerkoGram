# SerkoGram 2.0 — Test Plan

## Current Test Matrix

**Status:** 20 test files · 138 tests · 100% passing  
**Framework:** Vitest v2.1.9  
**Run command:** `npm test -- --run`

---

## Test Suites

### Security Tests (4 suites, 23 tests)

| File | Tests | Category | What it verifies |
|------|-------|----------|-----------------|
| `auth.test.ts` | 7 | Auth | HMAC-SHA256 initData validation, session creation, invalid signatures |
| `api-idor.test.ts` | 2 | IDOR | Cross-user access prevention on API routes |
| `media-security.test.ts` | 4 | Storage | Owner-scoped media access, non-owner rejection |
| `owner-notification.test.ts` | 10 | Privacy | Silent archive, owner-only DM routing, assertNotificationDestination |

### Command & Automation Tests (5 suites, 50 tests)

| File | Tests | Category | What it verifies |
|------|-------|----------|-----------------|
| `commands.test.ts` | 12 | Registry | Registry validation, banned command exclusion, unique aliases |
| `dot-commands.test.ts` | 17 | Execution | Dot command parsing, text effects, command detection |
| `chat-automation-hardened.test.ts` | 9 | State machines | .mute/.panic DB persistence, .timer limits, .warn counts |
| `critical-automation-e2e.test.ts` | 3 | E2E (simulated) | Full mute pipeline, callback rejection, owner unmute |
| `text-effects.test.ts` | 7 | Text | .flip, .bubble, .leet, .zalgo, .dumb transformations |

### Webhook & Integration Tests (4 suites, 26 tests)

| File | Tests | Category | What it verifies |
|------|-------|----------|-----------------|
| `webhook.test.ts` | 15 | Webhook | Update routing, idempotency, business connection handling |
| `webhook-retry.test.ts` | 3 | Reliability | Duplicate update handling, retry safety |
| `outgoing-message.test.ts` | 5 | Messages | Owner outgoing vs interlocutor incoming detection |
| `rate-limit.test.ts` | 4 | Rate limit | Cooldown enforcement, bypass for owner |

### Service Tests (5 suites, 23 tests)

| File | Tests | Category | What it verifies |
|------|-------|----------|-----------------|
| `services.test.ts` | 4 | Services | Service initialization, dependency injection |
| `message-service.test.ts` | 3 | Persistence | Message save, edit, delete operations |
| `search-service.test.ts` | 3 | Search | Full-text search, chat-scoped results |
| `ephemeral-media.test.ts` | 9 | Media | Ephemeral detection, view-once handling, archive status |
| `retention-service.test.ts` | 3 | Retention | Scheduled cleanup, retention policy |

### Frontend Tests (2 suites, 16 tests)

| File | Tests | Category | What it verifies |
|------|-------|----------|-----------------|
| `animation-and-controls.test.ts` | 9 | UI | AnimationEngine steps, inline keyboard generation |
| `games.test.ts` | 9 | Games | Tic-tac-toe board, RPS logic, dice simulation |

---

## What IS Tested

- ✅ HMAC-SHA256 initData validation
- ✅ Owner vs non-owner command authorization
- ✅ IDOR protection on API routes
- ✅ Silent archive (no managed chat notifications)
- ✅ Banned command rejection (.dox, .deanon, .osint)
- ✅ Mute/panic DB persistence and state transitions
- ✅ Timer serverless limit enforcement
- ✅ Warning count persistence and threshold actions
- ✅ Webhook idempotency (ProcessedUpdate deduplication)
- ✅ Duplicate update retry safety
- ✅ Text effect transformations
- ✅ Ephemeral/view-once media detection

## What is NOT Tested (Gaps)

- ⚠️ **Real Telegram API calls** — all tests use mocked bot.api
- ⚠️ **Database integration** — tests mock Prisma, no real PostgreSQL
- ⚠️ **Vercel Blob storage** — mocked, no real upload/download
- ⚠️ **Mini App frontend rendering** — no component rendering tests
- ⚠️ **Mobile responsive breakpoints** — no visual regression tests
- ⚠️ **Concurrent webhook processing** — no concurrency stress tests
- ⚠️ **AI provider integration** — disabled, no real OpenAI/Gemini calls

---

## Verification Commands

```bash
# Full test suite
npm test -- --run

# TypeScript compilation
npx tsc --noEmit

# ESLint
npm run lint

# Production build
npm run build

# All-in-one regression
npm test -- --run && npx tsc --noEmit && npm run lint && npm run build
```

---

## Real Telegram E2E Matrix (Manual)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Connect business account via BotFather | business_connection update received | Manual |
| 2 | Open managed chat, send `.help` | Bot replies with help text | Manual |
| 3 | Send `.info` | Bot shows chat/user info | Manual |
| 4 | Reply to message with `.save` | Media saved to DB + Blob, owner notified via DM | Manual |
| 5 | Send `.mute 30` | Mute state persisted in DB, inline unmute button shown | Manual |
| 6 | Interlocutor sends message | Message deleted (mute active) | Manual |
| 7 | Owner clicks unmute button | Mute disabled, confirmation sent | Manual |
| 8 | Send `.timer 10` | Timer notification after 10 seconds | Manual |
| 9 | Send `.coin` | Random coin flip result | Manual |
| 10 | Send `.flip Hello` | Flipped text response | Manual |
| 11 | Edit a message | MessageVersion created in DB | Manual |
| 12 | Delete a message | Message marked isDeleted in DB | Manual |
| 13 | Restart/redeploy | Mute/panic state survives cold start | Manual |
