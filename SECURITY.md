# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue
2. Email security concerns to the repository owner
3. Include a detailed description of the vulnerability
4. Include steps to reproduce if possible

We will respond within 48 hours and work to resolve the issue promptly.

## Security Measures

SerkoGram implements the following security measures:

### Authentication
- Telegram initData HMAC-SHA256 validation (official algorithm)
- Signed cookie-based sessions with expiration
- Admin authorization via Telegram ID whitelist

### Data Protection
- All secrets stored as environment variables (never in source code)
- No sensitive data in client-side code
- IDOR protection on all API endpoints
- User data scoped to authenticated sessions

### API Security
- Rate limiting on all endpoints
- Zod input validation
- SQL injection prevention via Prisma ORM
- XSS prevention via React's default escaping
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

### Media Security
- Ownership verification before media access
- Secure storage URLs
- File type validation

### Infrastructure
- HTTPS-only communication
- Webhook secret token verification
- No long-lived tokens in browser storage
