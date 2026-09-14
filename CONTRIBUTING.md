# Contributing to SerkoGram

Thank you for your interest in contributing to SerkoGram!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your values
4. Run `npm run db:push` to set up the database
5. Run `npm run dev` to start the development server

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- Tailwind CSS for styling
- Use the `sg-*` color tokens from tailwind.config.ts

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run typecheck && npm run lint && npm run test && npm run build`
4. Submit a pull request with a clear description

## Commit Messages

Follow conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `style:` formatting
- `refactor:` code restructuring
- `test:` tests
- `chore:` maintenance

## Security

See [SECURITY.md](SECURITY.md) for reporting security vulnerabilities.
