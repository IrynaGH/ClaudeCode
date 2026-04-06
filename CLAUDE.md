# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Tests (Vitest + jsdom)
npm run test

# Run a single test file
npx vitest src/lib/__tests__/file-system.test.ts

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Create a new migration after schema changes
npx prisma migrate dev --name <migration-name>
```

**Important:** The dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (already set in the npm script). This shim removes `globalThis.localStorage`/`globalThis.sessionStorage` that Node 25+ exposes, which would otherwise break SSR.

## Architecture

### Core Concept: Virtual File System

The central domain object is `VirtualFileSystem` (`src/lib/file-system.ts`). It holds all AI-generated component files in memory — nothing is ever written to disk. When projects are saved, the entire VFS is serialized to JSON and stored in `Project.data` (a SQLite column via Prisma).

### AI Agent Loop

`src/app/api/chat/route.ts` is the streaming AI endpoint. It uses the Vercel AI SDK's `streamText` with two tools:
- `str_replace_editor` (`src/lib/tools/str-replace.ts`) — targeted find-and-replace on virtual files
- `file_manager` (`src/lib/tools/file-manager.ts`) — create/read/delete virtual files

The model runs up to 40 steps per request. Without `ANTHROPIC_API_KEY`, `src/lib/provider.ts` substitutes a `MockLanguageModel` that returns static React component code.

The system prompt for component generation lives in `src/lib/prompts/generation.tsx`.

### Live Preview Pipeline

AI-generated JSX/TSX is compiled at runtime on the client using `@babel/standalone` (`src/lib/transform/jsx-transformer.ts`) and rendered in a sandboxed iframe (`src/components/preview/PreviewFrame.tsx`).

### State Management

Two React contexts bridge server state to client components:
- `src/lib/contexts/file-system-context.tsx` — owns the `VirtualFileSystem` instance; all file mutations go through here
- `src/lib/contexts/chat-context.tsx` — manages chat message history and streaming state

### Auth

JWT sessions (HS256, 7-day expiry) stored in `httpOnly` cookies, implemented in `src/lib/auth.ts` using `jose`. Passwords are hashed with `bcrypt`. `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes. The `server-only` package is imported in `src/lib/auth.ts` to enforce the server boundary.

### Data Layer

Prisma 6 with SQLite (`prisma/dev.db`). The generated client outputs to `src/generated/prisma/` (not the default location). Always refer to `prisma/schema.prisma` to understand the structure of data stored in the database. Schema has two models: `User` and `Project` (with a `data` JSON column holding the serialized VFS).

### Path Alias

`@/*` resolves to `src/*` throughout the codebase (configured in `tsconfig.json` and picked up by Vitest via `vite-tsconfig-paths`).

## Code Style

- Use comments sparingly. Only comment complex or non-obvious code.

## Tech Stack

- **Next.js 15** (App Router, React Server Components, Server Actions in `src/actions/`)
- **React 19**, **TypeScript 5** (strict mode)
- **Vercel AI SDK v4** + **@ai-sdk/anthropic** (model: `claude-haiku-4-5`)
- **Prisma 6** + SQLite
- **Tailwind CSS v4** + **shadcn/ui** (style: `new-york`, primitives in `src/components/ui/`)
- **Monaco Editor** for the code editor pane
- **Vitest** + **jsdom** + **Testing Library** for tests
