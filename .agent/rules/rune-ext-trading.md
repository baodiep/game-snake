# rune-ext-trading

> Rune L4 Skill | extension


# @rune/trading

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

Fintech applications demand precision that general-purpose patterns cannot guarantee. This pack groups five tightly-coupled concerns — safe money arithmetic, WebSocket reliability, financial chart rendering, streaming indicator computation, and experiment-driven strategy development — because a gap in any one layer breaks the entire trading surface. It solves the recurring problem of developers accidentally using JavaScript floats for currency, missing auto-reconnect logic, or computing indicators on stale snapshots. Activates automatically when trading or financial project signals are detected.

## Triggers

- Auto-trigger: when `TradingView`, `Lightweight Charts`, `decimal.js`, `ccxt`, or `ws` detected in `package.json`
- Auto-trigger: when files matching `**/price*.ts`, `**/ticker*.ts`, `**/orderbook*.ts` exist in project
- `/rune trading` — manual invocation
- Called by `cook` (L1) when fintech or trading project context detected

## Skills Included

| Skill | Model | Description |
|-------|-------|-------------|
| [fintech-patterns](skills/fintech-patterns.md) | sonnet | Safe money handling with Decimal/BigInt, transaction processing, audit trails, regulatory compliance, and PnL calculations. |
| [realtime-data](skills/realtime-data.md) | sonnet | WebSocket lifecycle management, auto-reconnect with exponential backoff, event normalization, rate limiting, and TanStack Query cache invalidation. |
| [chart-components](skills/chart-components.md) | sonnet | Candlestick, line, and area charts using TradingView Lightweight Charts with real-time updates, crosshair sync, indicator overlays, and reduced-motion support. |
| [indicator-library](skills/indicator-library.md) | sonnet | SMA, EMA, RSI, MACD, Bollinger Bands, VWAP — streaming calculation patterns that update incrementally on each new tick. |
| [trade-logic](skills/trade-logic.md) | sonnet | Entry/exit spec management, indicator parameter registry, strategy state tracking, and backtest result linkage. |
| [experiment-loop](skills/experiment-loop.md) | sonnet | Scientific method for strategy development — hypothesize → implement → backtest → analyze → refine. |
| [quant-analysis](skills/quant-analysis.md) | sonnet | Portfolio metrics, risk calculations, statistical edge detection, Monte Carlo simulation, and position sizing models. |

## Tech Stack Support

| Framework | Library | Notes |
|-----------|---------|-------|
| React 19 / Vite | Lightweight Charts 5.x | Preferred for custom dashboards |
| React 19 / Next.js | TradingView Charting Library | For advanced trading terminals |
| Any | Decimal.js 10.x | Required for all money arithmetic |
| Any | ws / native WebSocket | Auto-reconnect via `realtime-data` skill |
| React 19 | TanStack Query v5 | WebSocket → cache invalidation bridge |
| Any | date-fns-tz | Timezone-safe candle timestamp handling |

## Connections

```
Calls → @rune/ui (L4): chart component styling, color tokens, responsive layout
Called By ← cook (L1): when trading project detected
Called By ← launch (L1): pre-flight check for financial dashboards
Called By ← logic-guardian (L2): when project is classified as trading domain
```

## Sharp Edges

| Failure Mode | Severity | Mitigation |
|---|---|---|
| Float arithmetic on price (`0.1 + 0.2 !== 0.3`) silently corrupts PnL | HIGH | Enforce Decimal.js at parse boundary; lint rule banning `*`, `+`, `-` on raw number price fields |
| WebSocket silently stops receiving after network blip with no reconnect | HIGH | Always attach `onclose` handler; test disconnect/reconnect in CI with a mock server |
| Chart series not removed on symbol change causes memory leak and ghost lines | HIGH | Track series refs; call `chart.removeSeries(s)` in cleanup / `useEffect` return |
| Indicator computed on float prices accumulates rounding drift over 1000+ ticks | MEDIUM | Feed Decimal-converted `toNumber()` only at the indicator boundary; document precision loss |
| `localStorage` used for auth token or balance cache exposes data to XSS | HIGH | Use `httpOnly` cookies or in-memory store; audit with `Grep pattern="localStorage" glob="**/*.ts"` |
| Candlestick timestamps in local timezone cause gaps on DST transitions | MEDIUM | Normalize all timestamps to UTC unix seconds at the WebSocket boundary |

## Done When

- All price/quantity/fee fields are wrapped in `Decimal` with no raw float arithmetic reachable by Grep
- WebSocket reconnects automatically after 5-second disconnect in manual or automated test
- Chart renders candlesticks and at least one indicator overlay without layout shift on resize
- Streaming indicator values match reference batch output within floating-point display tolerance
- `prefers-reduced-motion` disables chart animations (verified via browser devtools emulation)
- No `localStorage` usage for financial data (confirmed by Grep audit)

## Cost Profile

~2,000–4,000 tokens per skill activation. `sonnet` default for code generation; `haiku` for Grep/file-scan steps; `opus` if regulatory compliance or security audit context is detected. Full pack activation (all 7 skills) runs ~14,000–28,000 tokens end-to-end.

---
> **Rune Skill Mesh** — 58 skills, 200+ connections, 14 extension packs
> Source: https://github.com/rune-kit/rune (MIT)
> **Rune Pro** ($49 lifetime) — product, sales, data-science, support packs → [rune-kit/rune-pro](https://github.com/rune-kit/rune-pro)
> **Rune Business** ($149 lifetime) — finance, legal, HR, enterprise-search packs → [rune-kit/rune-business](https://github.com/rune-kit/rune-business)