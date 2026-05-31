# Contributing to Forge Studio

Thank you for your interest in contributing to Forge Studio!

## Development Setup

### Prerequisites

- Node.js 22+ (recommended: use nvm)
- pnpm 10+
- PostgreSQL 17 (port 5434)
- Redis 7 (port 6379)

### Getting Started

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/forge-studio.git
cd forge-studio

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your local database credentials

# 4. Setup database
npx drizzle-kit push
npx tsx server/seed.ts

# 5. Start development server
pnpm dev
```

The server starts at http://localhost:5051 with hot-reload.

### Project Structure

```
forge-studio/
├── client/src/          # Vite + React SPA frontend
│   ├── pages/           # Route pages (one per route)
│   ├── components/      # Reusable components
│   ├── lib/             # tRPC client, utilities
│   └── contexts/        # React contexts (Theme)
├── server/              # Express + tRPC backend
│   ├── _core/           # Server entry, auth, tRPC setup
│   ├── routers/         # tRPC routers (one per domain)
│   ├── services/        # Service modules (business logic)
│   ├── db.ts            # Drizzle ORM data access layer
│   └── routers.ts       # Master tRPC router (aggregates all)
├── shared/              # Shared types & constants
├── drizzle/             # Database schema & migrations
└── scripts/             # Utility scripts
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over type aliases for objects
- Use `readonly` for immutable data
- Avoid `any` — use `unknown` and narrow with type guards

### React

- Functional components only (no class components)
- Use hooks for state and side effects
- One component per file
- Props interface named `{ComponentName}Props`

### Backend

- tRPC routers: one router per domain, in `server/routers/`
- Services: pure functions or singleton classes in `server/services/`
- Database access: use `server/db.ts` functions, never raw SQL in routers

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `virtual-key-service.ts` |
| Components | PascalCase | `VirtualKeyCard.tsx` |
| tRPC routers | snake_case files | `virtual_key_router.ts` |
| Database tables | camelCase | `virtualKeys` |
| CSS classes | Tailwind utility | `bg-background text-foreground` |

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feat/my-new-feature    # Feature
git checkout -b fix/my-bugfix          # Bug fix
git checkout -b docs/documentation     # Documentation
git checkout -b refactor/cleanup       # Refactor
```

### 2. Branch Naming

- `feat/*` — New features
- `fix/*` — Bug fixes
- `docs/*` — Documentation changes
- `refactor/*` — Code refactoring
- `test/*` — Adding tests
- `chore/*` — Maintenance tasks

### 3. Make Changes

- Follow the code style above
- Add TypeScript types for new data structures
- Update documentation if adding user-facing features

### 4. Verify

```bash
pnpm check        # Type checking
pnpm lint         # Linting
pnpm test         # Tests
pnpm build        # Production build
```

### 5. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new provider health dashboard
fix: resolve budget calculation overflow
docs: update deployment guide
refactor: simplify LLM router selection logic
```

### 6. Push & Create PR

```bash
git push origin feat/my-new-feature
```

Create a PR with:
- Clear title describing the change
- Description of what and why
- Screenshots for UI changes
- Test results

## Development Tips

### Database Changes

After modifying `drizzle/schema.ts`:

```bash
npx drizzle-kit generate    # Generate migration SQL
npx drizzle-kit migrate     # Apply migration
# or
npx drizzle-kit push        # Push schema directly (dev only)
```

### Adding a New tRPC Router

1. Create `server/routers/my_router.ts`
2. Import and add to `server/routers.ts`
3. The router is automatically available at `/api/trpc/myRouter.*`

### Adding a New Page

1. Create `client/src/pages/MyPage.tsx`
2. Add route in `client/src/App.tsx`
3. Add sidebar link in `client/src/components/DashboardLayout.tsx`

### Environment Variables

- `.env` — Local development (gitignored)
- `.env.example` — Template (committed)
- Systemd service — Uses `Environment=` directives

## Reporting Issues

- Use GitHub Issues
- Include: OS, Node version, error message, steps to reproduce
- For security issues, email directly (see README)

## License

By contributing, you agree that your contributions will be licensed under MIT.
