# SerkoGram 2.0 — Production Deployment Guide

This guide details the complete deployment, environment configuration, database migration, and webhook lifecycle for **SerkoGram 2.0**.

---

## 1. Prerequisites

- **Node.js**: v20.x or higher (LTS recommended)
- **Package Manager**: npm (comes with Node.js)
- **Database**: PostgreSQL (Neon, Supabase, or Vercel Postgres) with Connection Pooling enabled (PgBouncer)
- **Object Storage**: Vercel Blob (or S3-compatible storage with token)
- **Telegram Bot**: Registered via [@BotFather](https://t.me/BotFather) with Telegram Business features enabled:
  - `can_connect_to_business: true`
  - Inline mode enabled (optional, for mini app shortcuts)
  - Bot Menu Button configured to point to Web App URL (`https://<your-domain>`)
- **Hosting**: Vercel (Edge & Node Serverless runtime)

---

## 2. Environment Variables

Configure the following variables in your `.env` (local) and Vercel Project Settings (Production):

| Variable | Description | Required | Example |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot API token from @BotFather | **Yes** | `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ` |
| `TELEGRAM_BOT_USERNAME` | Username of the bot without `@` | **Yes** | `SerkoGram_bot` |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token sent in `X-Telegram-Bot-Api-Secret-Token` header | **Yes** | `a-secure-random-64-char-hex-string` |
| `DATABASE_URL` | PostgreSQL pooled connection string (used by app) | **Yes** | `postgres://user:pass@ep-xyz-pooler.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | PostgreSQL direct connection string (used for migrations) | **Yes** | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS domain where the app is hosted | **Yes** | `https://serkogram.vercel.app` |
| `SESSION_SECRET` | High-entropy secret for cookie/JWT signing (≥32 chars) | **Yes** | `7d8f9e0a1b2c3d4e5f6a7b8c9d0e1f2a` |
| `BLOB_READ_WRITE_TOKEN` | Read/write token for Vercel Blob media storage | **Yes** | `vercel_blob_rw_...` |
| `ADMIN_TELEGRAM_ID` | Telegram numeric ID of superadmin | Recommended | `123456789` |
| `OPENAI_API_KEY` | Optional OpenAI API key (for `.gpt`, `.image`) | Optional | `sk-...` |

---

## 3. Local Development Setup

1. **Clone repository & install dependencies:**
   ```bash
   git clone <repo_url>
   cd SerkoGram
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env.local
   # Fill in your variables in .env.local
   ```

3. **Generate Prisma Client & apply schema migrations:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Expose local server for Telegram Webhook (e.g. ngrok):**
   ```bash
   ngrok http 3000
   # Then set webhook via Telegram Bot API (see step 5)
   ```

---

## 4. Database Setup & Migrations

SerkoGram uses Prisma ORM with PostgreSQL.

- Generate client:
  ```bash
  npx prisma generate
  ```
- Deploy migrations to production:
  ```bash
  npx prisma migrate deploy
  ```
- Alternatively, push schema directly:
  ```bash
  npx prisma db push
  ```

---

## 5. Webhook Configuration

Set the Telegram Bot webhook pointing to your `/api/telegram/webhook` endpoint with secret token and allowed updates:

### Automated Setup (via curl or script)
```bash
curl -F "url=https://<your-domain>/api/telegram/webhook" \
     -F "secret_token=<YOUR_TELEGRAM_WEBHOOK_SECRET>" \
     -F "allowed_updates=[\"business_connection\",\"business_message\",\"edited_business_message\",\"deleted_business_messages\",\"message\",\"callback_query\"]" \
     https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
```

### Verify Webhook Status
```bash
curl https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Response must confirm:
- `url`: `https://<your-domain>/api/telegram/webhook`
- `has_custom_certificate`: `false`
- `pending_update_count`: `0` (or low number)
- `last_error_date`: null or 0

---

## 6. Vercel Deployment

### Deploy via Vercel CLI
```bash
# Preview deployment
npx vercel

# Production deployment
npx vercel --prod --yes
```

### Environment Variables on Vercel
Ensure all environment variables from Section 2 are added to the Vercel project settings:
```bash
npx vercel env add TELEGRAM_BOT_TOKEN production
npx vercel env add TELEGRAM_WEBHOOK_SECRET production
npx vercel env add DATABASE_URL production
npx vercel env add DIRECT_URL production
npx vercel env add SESSION_SECRET production
npx vercel env add BLOB_READ_WRITE_TOKEN production
npx vercel env add NEXT_PUBLIC_APP_URL production
```

---

## 7. Production Verification Checklist

- [ ] Webhook URL registered and responds with 200 OK
- [ ] Bot token has business connection rights in @BotFather
- [ ] PostgreSQL connection pool active and queries succeed
- [ ] Vercel Blob read/write token active
- [ ] Mini App loads in Telegram without CORS or frame blocking
- [ ] All 138 test cases pass (`npm test -- --run`)
- [ ] Typecheck passes without errors (`npx tsc --noEmit`)
- [ ] Next.js build generates clean production bundles (`npm run build`)
