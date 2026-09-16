# SerkoGram 2.0 — Security Audit

## Security Perimeter

SerkoGram operates with three trust boundaries:

1. **Telegram → Webhook**: Validated via `X-Telegram-Bot-Api-Secret-Token`
2. **Mini App → API Routes**: Validated via HMAC-SHA256 `initData` + JWT session
3. **API Routes → Database**: Owner-scoped queries (never cross-user)

---

## 1. Authentication

### Mini App initData Validation
- **Location:** `src/lib/auth/telegram.ts`
- **Algorithm:** HMAC-SHA256 per Telegram specification
  1. Parse `initData` query string
  2. Extract `hash` parameter
  3. Build `data_check_string` (alphabetically sorted `key=value\n`)
  4. `secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)`
  5. `computed = HMAC-SHA256(secret_key, data_check_string)`
  6. Compare `computed === hash`
- **Expiry:** `auth_date` checked against configurable TTL
- **Test coverage:** `auth.test.ts` (7 tests)

### Session Management
- **Location:** `src/lib/auth/session.ts`
- JWT signed with server secret, httpOnly cookie
- `requireAuth()` middleware on all protected API routes

---

## 2. Authorization — Owner-Scoped Access

All database queries enforce ownership through Prisma relation chains:

```
media → message → chat → connection → userId
chats → connection → userId
messages → chat → connection → userId
notifications → userId
support tickets → userId
```

**Test coverage:** `api-idor.test.ts` (2 tests), `media-security.test.ts` (4 tests)

---

## 3. IDOR Protection

| Route | Protection | Verified |
|-------|-----------|----------|
| `GET /api/media/[id]` | `message.chat.connection.userId === user.id` | ✅ |
| `GET /api/chats/[id]` | `connection.userId === user.id` | ✅ |
| `GET /api/messages` | `chat.connection.userId === user.id` | ✅ |
| `GET /api/messages/[id]` | `chat.connection.userId === user.id` | ✅ |
| `GET /api/notifications` | `userId === user.id` | ✅ |
| `GET /api/support/tickets` | `userId === user.id` | ✅ |
| `GET /api/support/tickets/[id]` | `userId === user.id` | ✅ |

---

## 4. Webhook Security

- **Location:** `src/app/api/telegram/webhook/route.ts`
- `X-Telegram-Bot-Api-Secret-Token` validated against `TELEGRAM_WEBHOOK_SECRET`
- Returns 401 on missing/invalid secret
- Returns 200 on all valid requests (Telegram retries on non-200)
- Idempotency via `ProcessedUpdate` table — prevents duplicate processing

---

## 5. Archive Privacy

- **Location:** `src/lib/services/owner-notification-service.ts`
- Archive confirmations NEVER sent to managed chat
- All notifications route to owner's private bot DM or Mini App inbox
- `assertNotificationDestination()` blocks any attempt to send to non-owner
- **Test coverage:** `owner-notification.test.ts` (10 tests including security violation checks)

---

## 6. Banned Commands

| Command | Status | Enforcement |
|---------|--------|-------------|
| `.dox` | BANNED | Registry exclusion + executor guard + ToS violation response |
| `.deanon` | BANNED | Registry exclusion + executor guard + ToS violation response |
| `.osint` | BANNED | Registry exclusion + executor guard + ToS violation response |

- **Registry:** `commands.test.ts` asserts banned prefixes are NOT in `getAllCommands()`
- **Executor:** Explicit security check (check 1b) in `executeDotCommand()` traps banned commands

---

## 7. Rate Limiting

- Per-command cooldowns in executor (in-memory Map, resets on cold start — acceptable)
- Rate limit violations return user-friendly messages without internal details
- Owner bypass for critical commands

---

## 8. Data Isolation

- **Internal DB ID (cuid string) ≠ Telegram ID (BigInt)** — never compared with `===`
- All Prisma queries use `connection.userId` chain for ownership
- Media URLs are never exposed to client — reverse-proxied through `/api/media/[id]`
- Storage URLs include owner/chat scoping in path

---

## Security Findings

### Critical — None Found

### High — None Found

### Medium

| # | Finding | Status |
|---|---------|--------|
| M1 | Rate limit cooldowns are in-memory (reset on cold start) | ACCEPTED — no data loss, just reset |
| M2 | bcCache in connection-service is in-memory | ACCEPTED — performance cache, re-fetched from Telegram |

### Low

| # | Finding | Status |
|---|---------|--------|
| L1 | Bot token appears in media download URL construction (server-side only) | ACCEPTABLE — never exposed to client |
| L2 | Error messages in catch blocks may leak internal details in dev | MITIGATED — production errors sanitized |
