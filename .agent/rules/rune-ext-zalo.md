# rune-ext-zalo

> Rune L4 Skill | extension


# @rune/zalo

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

Zalo is Vietnam's dominant messaging platform (~75M users) but its developer ecosystem has critical gaps: no Node.js SDK, zero webhook handling in official SDKs, undocumented rate limits, and confusing dual-token OAuth2 flows. This pack provides production-ready guidance for two tracks:

**Track A — Official Account API** (production-safe): OAuth2 PKCE, 8 message types, webhook server, token lifecycle, and MCP server blueprint for AI agent integration. Use this for business chatbots, customer support automation, and notification systems.

**Track B — Personal Account via zca-js** (unofficial, risk-gated): QR login, personal/group messaging, media handling. Use this for personal bots, group utilities, and rapid prototyping before committing to OA.

Both tracks share a rate limiting skill — the #1 cause of account bans.

## Best Fit

- Vietnamese dev teams building Zalo OA chatbots or customer support automation
- AI agent projects that need Zalo as a communication channel (MCP server pattern)
- Personal automation: group bots, notification forwarders, quick prototypes
- Projects migrating from unofficial to official Zalo API

## Not a Fit

- Facebook Messenger, Telegram, or Discord bots — different APIs entirely
- ZaloPay payment integration (separate API surface, not covered here)
- Zalo Mini App development (JSAPI bridge, not OA/personal messaging)

## Triggers

- Auto-trigger: when `zalo`, `zca-js`, `@anthropic-ai/sdk` + Zalo context detected
- `/rune zalo-oa` — Official Account setup and messaging
- `/rune zalo-personal` — Personal account automation
- `/rune zalo-mcp` — MCP server for AI agent ↔ Zalo
- `/rune zalo-rate` — Rate limiting and anti-ban strategies
- Called by `cook` (L1) when Zalo integration task detected
- Called by `mcp-builder` (L2) when building Zalo MCP server

## Skills Included

| Skill | Model | Track | Description |
|-------|-------|-------|-------------|
| [zalo-oa-setup](skills/zalo-oa-setup.md) | sonnet | A | OAuth2 PKCE flow, dual token management (User vs OA), app registration, appsecret_proof signing, token auto-refresh middleware. |
| [zalo-oa-messaging](skills/zalo-oa-messaging.md) | sonnet | A | All 8 OA message types (text, image, file, sticker, list, template, transaction, promotion), follower management, broadcast with demographic targeting. |
| [zalo-oa-webhook](skills/zalo-oa-webhook.md) | sonnet | A | Webhook server setup, event routing, signature verification, retry handling, event type catalog, Express/Fastify/Hono patterns. |
| [zalo-oa-mcp](skills/zalo-oa-mcp.md) | sonnet | A | MCP server blueprint — tools for read/send/broadcast, webhook-to-MCP bridge, credential storage, AI agent conversation loop. |
| [zalo-personal-setup](skills/zalo-personal-setup.md) | sonnet | B | zca-js setup, QR login flow, credential persistence, session management, WebSocket listener, keepAlive, anti-detection baseline. |
| [zalo-personal-messaging](skills/zalo-personal-messaging.md) | sonnet | B | Personal/group messaging, media (image/video/voice/sticker), reactions, group management (create, members, settings), mention gating, message buffer. |
| [zalo-rate-guard](skills/zalo-rate-guard.md) | sonnet | Shared | Rate limiting patterns for both tracks — token bucket per endpoint, exponential backoff, queue management, quota monitoring, anti-ban strategies. |

## Risk Gate — Track B (Personal Account)

<HARD-GATE>
Track B skills use unofficial reverse-engineered APIs via zca-js.
Before ANY Track B implementation, the developer MUST acknowledge:

1. **ToS violation**: Personal account automation violates Zalo's Terms of Service
2. **Ban risk**: Account can be suspended without warning
3. **Single-session**: Cannot run bot + personal Zalo simultaneously on same account
4. **API instability**: Zalo can break the internal API at any time without notice
5. **No support**: Zalo will not help with issues caused by unofficial API usage

Track B is for: personal projects, prototypes, group utilities.
Track B is NOT for: production business systems, customer-facing bots, high-volume messaging.

For production use → Track A (Official Account API).
</HARD-GATE>

## Connections

```
Calls → mcp-builder (L2): zalo-oa-mcp uses mcp-builder patterns for server scaffolding
Calls → sentinel (L2): credential handling triggers security review
Calls → rate-guard (shared): all messaging skills call rate-guard before API calls
Calls → verification (L3): verify webhook server is running and receiving events
Called By ← cook (L1): when Zalo integration task detected in project
Called By ← scaffold (L1): when bootstrapping a Zalo bot project
Called By ← mcp-builder (L2): when building Zalo-specific MCP server
```

## Tech Stack

| Component | Recommended | Alternatives |
|-----------|-------------|--------------|
| Runtime | Node.js 20+ | Bun, Deno |
| OA HTTP client | undici / fetch | axios |
| Personal API | zca-js | none (only option) |
| Webhook server | Hono | Express, Fastify |
| MCP framework | @anthropic-ai/sdk | custom |
| Queue (rate limit) | p-queue | bottleneck, bull |
| Validation | zod | joi |

## Constraints

1. All skills MUST reference Zalo OA API v3 (not deprecated v2)
2. Track B skills MUST display HARD-GATE risk disclaimer before execution
3. Rate limiting MUST be implemented before any messaging — no fire-and-forget
4. Credentials (tokens, cookies, secrets) MUST never be logged or committed
5. Webhook signature verification MUST NOT be skipped — even in development

## Done When

- OA OAuth2 flow working with auto-refresh
- All 8 message types documented with request/response examples
- Webhook server receiving and routing events correctly
- MCP server operational: agent can read and send Zalo messages
- Rate limiting active on all outbound API calls
- Track B: QR login + personal/group messaging working with risk gate shown

---
> **Rune Skill Mesh** — 58 skills, 200+ connections, 14 extension packs
> Source: https://github.com/rune-kit/rune (MIT)
> **Rune Pro** ($49 lifetime) — product, sales, data-science, support packs → [rune-kit/rune-pro](https://github.com/rune-kit/rune-pro)
> **Rune Business** ($149 lifetime) — finance, legal, HR, enterprise-search packs → [rune-kit/rune-business](https://github.com/rune-kit/rune-business)