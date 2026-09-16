# SerkoGram 2.0 — Known Limitations & Platform Constraints

This document provides a transparent, zero-trust breakdown of all technical, architectural, and platform limitations in SerkoGram 2.0.

---

## 1. Serverless Execution Constraints (Vercel)

### Function Execution Timeout
- **Limitation:** Next.js Route Handlers on Vercel Hobby plan have a maximum duration of **10–15 seconds** (Pro: up to 60 seconds with `maxDuration = 60`).
- **Impact on `.timer`:** Traditional `setTimeout` cannot run reliably beyond ~55 seconds because the serverless lambda shuts down once the HTTP response finishes.
- **Resolution in SerkoGram 2.0:** Short timers (<55s) run via bounded async timeouts. Long timers are persisted to the PostgreSQL `ScheduledJob` table and processed during subsequent webhook invocations or scheduled cron jobs.

### Stateless Memory Lifecycle
- **Limitation:** In-memory maps (`cooldowns`, `bcCache`) exist only for the lifetime of a warm lambda instance. When a cold start occurs, in-memory caches reset.
- **Resolution:** All critical automation state (`ChatAutomationSettings`, `ChatWarning`, `ProcessedUpdate`, `ScheduledJob`) is stored in PostgreSQL, ensuring state survives cold starts and restarts.

---

## 2. Telegram Bot API 7.2+ Limitations

### Private Chat Moderation Limitations
- **Constraint:** Telegram Bot API's `restrictChatMember` and `banChatMember` methods **only work in groups and supergroups**. Telegram does not allow bots to restrict users inside private 1-on-1 chats via those methods.
- **SerkoGram Solution:** In managed private business chats, moderation (`.mute`, `.panic`) functions as an automated incoming message deletion filter (`deleteMessage` using `business_connection_id`), deleting disallowed incoming messages instantly.

### Business Connection Permissions Dependency
- **Constraint:** A connected bot can only perform actions that the Telegram Business account owner explicitly enabled when connecting (e.g. `can_reply: true`).
- **Safety Guard:** If an owner revokes reply rights, bot command replies and actions fail with API error 403. SerkoGram verifies connection rights before executing commands.

### File Download Size Limits
- **Constraint:** The Telegram Bot API cloud gateway has a strict **20 MB download limit** for bot file downloads (`getFile`).
- **Impact:** Media files larger than 20 MB cannot be retrieved via Bot API cloud endpoints without a self-hosted Telegram Bot API server.

---

## 3. Commands Requiring External or MTProto Capabilities

Certain legacy features requested in userbot scripts cannot be implemented via the official Telegram Bot API alone:

| Command | Feature | Reason for Limitation / Status |
|---|---|---|
| `.online` | Permanent Online Status | Requires MTProto client session (TDLib/Pyrogram/Telethon). Bot API cannot alter user presence. Status: **DISABLED**. |
| `.autotyping` | Continuous Typing Status | Requires sustained MTProto background worker. Bot API `sendChatAction` lasts max 5 seconds. Status: **DISABLED**. |
| `.autovoice` | Continuous Audio Record Status | Same as above; MTProto-only. Status: **DISABLED**. |
| `.vnote` / `.vreverse` | Video Note / Video Reverse | Requires FFmpeg binary processing. Not available in Vercel serverless environment. Status: **DISABLED**. |
| `.stt` / `.гс` | Speech-to-Text | Requires external Whisper or Google STT API key. Status: **DISABLED** (unless STT provider configured). |
| `.gpt` / `.image` | AI Generation | Requires `OPENAI_API_KEY` or `GEMINI_API_KEY`. Returns friendly warning if not configured. |
| `.dox` / `.deanon` / `.osint` | Deanonymization | **PERMANENTLY BANNED** by security and privacy policy. |

---

## 4. Archive Privacy Guarantees

- **No Chat Leaks:** Media preservation and message archiving (`.save`, automatic saves) **never** post public confirmations in the interlocutor's chat.
- **Destination Verification:** All notifications are sent exclusively to the owner's private bot DM or saved to the Mini App Notification Center.
- **Unstarted Bot DM Fallback:** If the owner has not pressed `/start` in the private bot chat, Telegram rejects direct bot messages. SerkoGram captures this gracefully and stores the notification in the Mini App inbox instead of throwing an unhandled exception.

---

## 5. Storage & Bandwidth Limits

- **Vercel Blob Storage:** Media files are stored as blobs with unique hashes. Large archives with thousands of video files consume blob storage quotas.
- **Reverse Proxy Media Streaming:** To prevent IDOR and protect direct storage links, media files are reverse-proxied through `/api/media/[id]`. This consumes Vercel Serverless Function egress bandwidth.
