# rune-ext-backend

> Rune L4 Skill | extension


# @rune/backend

> **RUNE COMPLIANCE**: Before ANY code response, you MUST:
> 1. Classify this request (CODE_CHANGE | QUESTION | DEBUG | REVIEW | EXPLORE)
> 2. Route through the correct Rune skill (see skill-router routing table)
> 3. Follow the skill's workflow — do NOT freelance or skip steps
> Violation: writing code without skill routing = incorrect behavior.

## Platform Constraints

- SHOULD: Monitor your context usage. If working on a long task, summarize progress before context fills up.
- MUST: Before summarizing/compacting context, save important decisions and progress to project files.
- SHOULD: Before ending, save architectural decisions and progress to .rune/ directory for future sessions.

## Purpose

Backend codebases accumulate structural debt across six areas: inconsistent API contracts (mixed naming, missing pagination, vague errors), insecure auth flows (token mismanagement, missing refresh rotation, weak RBAC), database anti-patterns (N+1 queries, missing indexes, unsafe migrations), ad-hoc middleware (duplicated validation, no request tracing, inconsistent error format), missing or naive caching (no invalidation strategy, cache stampede risk, unbounded memory growth), and synchronous processing of inherently async work (blocking request threads on email, PDF, image tasks). This pack addresses each systematically — detect the anti-pattern, emit the fix, verify the result. Skills are independent but compound: clean APIs need solid auth, solid auth needs safe queries, safe queries need proper middleware, and high-traffic APIs need caching and background jobs to stay responsive.

## Triggers

- Auto-trigger: when `routes/`, `controllers/`, `middleware/`, `*.resolver.ts`, `*.service.ts`, `queues/`, `workers/`, or server framework config detected
- `/rune api-patterns` — audit and fix API design
- `/rune auth-patterns` — audit and fix authentication flows
- `/rune database-patterns` — audit and fix database queries and schema
- `/rune middleware-patterns` — audit and fix middleware stack
- `/rune caching-patterns` — audit and implement caching strategy
- `/rune background-jobs` — identify async operations and implement job queues
- `/rune cli-generation` — generate production CLI for existing backend services
- `/rune async-pipeline` — build multi-stage async processing pipelines with waterfall fallback
- Called by `cook` (L1) when backend task is detected
- Called by `review` (L2) when API/backend code is under review

## Skills Included

| Skill | Model | Description |
|-------|-------|-------------|
| [api-patterns](skills/api-patterns.md) | sonnet | RESTful and GraphQL API design patterns — resource naming, pagination, filtering, error responses, versioning, rate limiting, OpenAPI generation. |
| [auth-patterns](skills/auth-patterns.md) | sonnet | Authentication and authorization patterns — JWT, OAuth 2.0 / OIDC, passkeys/WebAuthn, session management, RBAC, API key management, MFA flows. |
| [database-patterns](skills/database-patterns.md) | sonnet | Database design and query patterns — schema design, migrations, indexing strategies, N+1 prevention, soft deletes, read replicas, connection pooling, seeding. |
| [middleware-patterns](skills/middleware-patterns.md) | sonnet | Middleware architecture — request validation, error handling, logging, CORS, compression, graceful shutdown, health checks, request ID tracking. |
| [caching-patterns](skills/caching-patterns.md) | sonnet | Caching strategies — in-memory LRU, Redis distributed cache, CDN/edge cache, browser cache headers, invalidation, and stampede prevention. |
| [background-jobs](skills/background-jobs.md) | sonnet | Queue-based async processing — BullMQ (Node.js), job patterns, retry strategies, idempotency, dead letter queues, monitoring. |
| [cli-generation](skills/cli-generation.md) | sonnet | Generate production-grade CLI wrappers — command groups, dual output mode (human + JSON), stateful REPL, session management with undo/redo, installable packaging. |
| [async-pipeline](skills/async-pipeline.md) | sonnet | Multi-stage async processing pipelines with waterfall engine selection, progress streaming via SSE, concurrency control, and credit-based billing. |

## Tech Stack Support

| Framework | ORM | Auth Library | Queue | Cache |
|-----------|-----|-------------|-------|-------|
| Express 5 | Prisma | Passport / custom JWT | BullMQ | ioredis |
| Fastify 5 | Drizzle | @fastify/jwt | BullMQ | ioredis |
| Next.js 16 (Route Handlers) | Prisma | NextAuth v5 / Lucia | BullMQ | ioredis / Upstash |
| NestJS 11 | TypeORM / Prisma | @nestjs/passport | @nestjs/bull | @nestjs/cache-manager |
| FastAPI | SQLAlchemy | python-jose / authlib | Celery | redis-py |
| Django 5 | Django ORM | django-rest-framework | Celery | django-redis |

## Connections

```
Calls → docs-seeker (L3): lookup API documentation and framework guides
Calls → sentinel (L2): security audit on auth implementations
Calls → watchdog (L3): monitor queue depth and cache hit ratios
Calls → @rune/devops (L4): container and serverless deployment config for backend services
Called By ← cook (L1): when backend task detected
Called By ← review (L2): when API/backend code is being reviewed
Called By ← audit (L2): backend health dimension
Called By ← deploy (L2): pre-deploy readiness checks (health endpoints, graceful shutdown)
Called By ← @rune/saas (L4): SaaS services use backend API, auth, and caching patterns
Called By ← @rune/security (L4): security audits reference auth flows and middleware patterns
Called By ← @rune/mobile (L4): mobile backend integration patterns (auth, push server)
Inter-skill: cli-generation → api-patterns (CLI wraps existing API surface)
Inter-skill: async-pipeline → background-jobs (pipeline stages use job queue for execution)
Inter-skill: async-pipeline → caching-patterns (pipeline results cached by content hash)
```

## Sharp Edges

- **Auth**: Never emit JWT without expiry; hard-cap access tokens at 15min, refresh at 7d.
- **Cache stampede**: Always emit Redis `SET NX` mutex lock on cache miss for hot keys.
- **Job idempotency**: Never use random UUID as job ID — use deterministic domain key (e.g., `email:welcome:${userId}`).
- **N+1**: Check ORM `lazy: true` defaults (Sequelize, TypeORM) — not caught by loop scan alone.
- **Migrations**: Every migration MUST include both `up()` and `down()` — flag any missing rollback.
- **LRU**: Always set `max` entries AND `ttl` — unbounded LRU grows to OOM.
- **CORS**: Flag `origin: '*'` in production configs; check `NODE_ENV` before emitting.
- **SSE**: Send heartbeat comment every 30s (`:\n\n`) to prevent proxy/LB 60s timeout drops.
- **Dead letters**: Emit alert on DLQ depth > 0 for critical queues; never silently drop failed jobs.
- **Credit math**: Always `Math.ceil()` final cost; use integer cents internally to avoid float drift.

## Done When

- API audit report emitted with naming violations, missing pagination, versioning strategy, and fix diffs
- Auth flow hardened: short-lived access tokens, httpOnly refresh cookies, proper hashing, OAuth/OIDC integration ready
- N+1 queries detected and replaced with eager loading; soft delete pattern applied; missing indexes migrated
- Middleware stack has: request ID, structured logging, global error handler, input validation, compression, graceful shutdown, health endpoints
- Caching strategy implemented: cacheable endpoints identified, cache layer selected, invalidation logic emitted alongside every write
- Async operations moved to background jobs: idempotency keys assigned, retry strategy configured, dead letter queue wired
- All emitted code uses project's existing framework and ORM (detected from package.json)
- CLI generated with dual output (human + JSON), REPL mode, session undo/redo, and installable package
- Async pipeline has waterfall engine selection, progress streaming via SSE, concurrency control, and credit billing
- Structured report emitted for each skill invoked

## Cost Profile

~14,000–28,000 tokens per full pack run (all 8 skills). Individual skill: ~2,000–5,000 tokens. Sonnet default for code generation and security audit. Use haiku for detection scans (Step 1 of each skill). Escalate to opus for architecture decisions on caching topology, pipeline design, or queue system selection in high-traffic systems.

---
> **Rune Skill Mesh** — 58 skills, 200+ connections, 14 extension packs
> Source: https://github.com/rune-kit/rune (MIT)
> **Rune Pro** ($49 lifetime) — product, sales, data-science, support packs → [rune-kit/rune-pro](https://github.com/rune-kit/rune-pro)
> **Rune Business** ($149 lifetime) — finance, legal, HR, enterprise-search packs → [rune-kit/rune-business](https://github.com/rune-kit/rune-business)