# SerkoGram — Changelog

All notable changes to this project are documented in this file.

## [2.0.0] — 2026-09-16

### Visual Identity — Liquid Glass 2.0
- Migrated entire design system from purple (`#8b5cf6`) to emerald (`#10b981`) palette
- New palette: black / graphite (`#09090b`, `#111114`, `#18181b`) / emerald / soft gray
- 104 CSS class replacements across 15 frontend files
- Added Liquid Glass 2.0 utility classes (`liquid-glass`, `liquid-glass-emerald`)
- Outgoing message bubbles: dark emerald gradient (`#065f46` → `#047857`)
- Incoming bubbles: graphite glass with `backdrop-blur-md`
- Bottom navigation: emerald active states with restrained ambient glow
- Focus rings: emerald (`#10b981`)
- Telegram theme integration updated to emerald accents

### Documentation Deliverables
- `SERKOGRAM_2_0_AUDIT.md` — Zero-trust forensic audit report
- `_ARCHITECTURE.md` — System architecture with Mermaid diagrams
- `_COMMANDS.md` — Complete 72-command reference table
- `_SECURITY.md` — Security perimeter and IDOR audit
- `_TEST_PLAN.md` — Testing matrix (20 suites, 138 tests)
- `_KNOWN_LIMITATIONS.md` — Honest serverless and Bot API constraints
- `_CHANGELOG.md` — Full evolutionary changelog
- `_DEPLOYMENT.md` — Deployment and environment guide

---

## [1.5.0] — 2026-09-15

### Core Architecture
- **Unified Command Context** (`resolveCommandContext`): separates DB `ownerId` (cuid) from `telegramOwnerId` (BigInt)
- **Single Source of Truth Registry**: 72 commands across 12 categories, startup validation
- **Durable Timer Scheduling**: PostgreSQL `ScheduledJob` table surviving serverless cold starts
- **Command Executor**: full switch coverage for all 72 commands, banned command guards

### Security
- Policy bans on `.dox`, `.deanon`, `.osint`
- HMAC-SHA256 Mini App `initData` validation
- Owner-scoped IDOR protection on all API routes

### Testing
- 20 test files, 138 tests, 100% passing

---

## [1.4.0] — 2026-09-14

### Liquid Glass UI (v1)
- AnimationEngine for Telegram message edit animations
- Command message cleanup (delete owner dot-commands after execution)
- Interactive moderation controls (inline unmute keyboard, owner-only callbacks)

---

## [1.3.0] — 2026-09-14

### Chat Automation Persistence
- `ChatAutomationSettings` and `ChatWarning` models in PostgreSQL
- Real `.mute` / `.panic` via DB-persisted state machines
- Honest command registry (removed fake status messages)

---

## [1.2.0] — 2026-09-13

### Private Owner Notifications
- Silent archive: no confirmation messages in managed chats
- Owner notifications routed to private bot DM or Mini App
- Notification center page (`/notifications`)

---

## [1.1.0] — 2026-09-13

### Connected Business Bot Automation
- Full dot command catalog, text effects engine, translation, ephemeral media
- Interactive games (`.ttt`, `.rps`, `.coin`)
- Webhook diagnostics endpoint

---

## [1.0.0] — 2026-09-12

### Initial Release
- Next.js 15 App Router, Prisma schema, Grammy bot, Telegram webhook
- REST API endpoints, Mini App UI, authentication via Telegram `initData`

---

## Git Commits
```
1d73fc9 feat: initialize SerkoGram architecture & project foundations
3ab7daa feat: add core lib, authentication & Telegram bot webhook
423cc40 feat: add REST API endpoints
1b1dd45 feat: add Telegram Mini App UI, pages, components & theme
f6ddb19 test: add unit & integration test suites
930cbd5 fix(audit): resolve database race conditions, UI states
be84c93 feat: complete command registry, parser, commands page
84184a0 feat: complete master upgrade with dot commands, ephemeral media
d42dd6a fix(telegram): resilient db fallback, interactive games state machine
20c5130 feat(business-bot): complete chat automation rebuild
1b46f97 feat(automation): complete real Connected Business Bot automation
e386484 feat: private owner notifications, silent archive fix
bfa6464 feat(automation): persist chat automation in PostgreSQL
5ccea11 feat: Liquid Glass UI, AnimationEngine, Command Message Cleanup
62009b7 feat(automation): resolveCommandContext, single source registry validation
```
