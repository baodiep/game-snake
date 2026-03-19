# rune-ext-analytics

> Rune L4 Skill | extension


# @rune/analytics

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

Analytics implementations fail silently: tracking events that fire but never reach the dashboard because the event name has a typo, A/B tests that run for weeks without reaching statistical significance because the sample size was never calculated, funnel reports that show a 90% drop-off that's actually a tracking gap, and dashboards that load 500K rows client-side because the aggregation happens in the browser instead of the database. This pack covers the full analytics stack — instrumentation, experimentation, analysis, and visualization — with patterns that produce data you can actually trust and act on.

## Triggers

- Auto-trigger: when `gtag`, `posthog`, `mixpanel`, `plausible`, `analytics`, `experiment`, `feature-flag`, `launchdarkly` detected
- `/rune tracking-setup` — set up or audit analytics tracking
- `/rune ab-testing` — design and implement A/B experiments
- `/rune funnel-analysis` — build conversion funnel tracking
- `/rune dashboard-patterns` — build analytics dashboard
- Called by `cook` (L1) when analytics feature requested
- Called by `marketing` (L2) when measuring campaign performance

## Skills Included

| Skill | Model | Description |
|-------|-------|-------------|
| [tracking-setup](skills/tracking-setup.md) | sonnet | GA4, Plausible, PostHog, Mixpanel — event taxonomy design, consent management, server-side tracking, UTM handling. |
| [ab-testing](skills/ab-testing.md) | sonnet | Experiment design, statistical significance, feature flags (LaunchDarkly, Unleash), rollout strategies, result analysis. |
| [funnel-analysis](skills/funnel-analysis.md) | sonnet | Conversion tracking, drop-off identification, cohort analysis, retention metrics, LTV calculation, attribution modeling. |
| [dashboard-patterns](skills/dashboard-patterns.md) | sonnet | KPI cards, time series charts, comparison views, drill-down navigation, export functionality, real-time counters. |
| [sql-patterns](skills/sql-patterns.md) | sonnet | Aggregations, window functions, CTEs, performance optimization, and safe parameterized queries for analytics workloads. |
| [data-validation](skills/data-validation.md) | sonnet | Input validation, schema enforcement, data pipeline checks, anomaly detection, and data freshness monitoring. |
| [statistical-analysis](skills/statistical-analysis.md) | sonnet | Significance testing, regression basics, distribution analysis, and correlation detection for product metrics. |

## Tech Stack Support

| Area | Options | Notes |
|------|---------|-------|
| Analytics | GA4, Plausible, PostHog, Mixpanel | Plausible for privacy-first; PostHog for product analytics |
| Feature Flags | LaunchDarkly, Unleash, GrowthBook | GrowthBook open-source with built-in A/B |
| Charts | Recharts, Tremor, Chart.js, D3 | Tremor best for dashboards; D3 for custom visualizations |
| Database | PostgreSQL + aggregation views | Pre-aggregate for dashboard performance |

## Connections

```
Calls → @rune/ui (L4): dashboard components
Calls → @rune/backend (L4): tracking API setup
Called By ← marketing (L2): measuring campaign performance
Called By ← cook (L1): when analytics feature requested
```

## Constraints

1. MUST use typed event taxonomy — ad-hoc event names create unmaintainable analytics that nobody trusts.
2. MUST implement consent management before any tracking — GDPR/CCPA compliance is non-negotiable.
3. MUST calculate sample size before starting A/B tests — running experiments without power analysis wastes time and produces meaningless results.
4. MUST aggregate data server-side for dashboards — sending raw events to the client causes slow loads and exposes user data.
5. MUST persist variant assignment per user — inconsistent assignment invalidates experiment results.

## Sharp Edges

| Failure Mode | Severity | Mitigation |
|---|---|---|
| Peeking at A/B test results before reaching sample size (false positive) | HIGH | Lock results until sample size reached; show "not yet significant" warning |
| Event name typo means data goes to wrong metric (silent data loss) | HIGH | Typed event taxonomy with TypeScript union; no raw string event names |
| Ad blockers drop 30-40% of client-side tracking events | HIGH | Implement server-side tracking proxy (`/api/analytics`); use `sendBeacon` |
| Dashboard loads 500K raw events client-side (browser freezes) | HIGH | Pre-aggregate in SQL; paginate time series; lazy-load off-screen charts |
| Same user gets different A/B variant across sessions (polluted results) | MEDIUM | Hash user ID + experiment ID for deterministic assignment; persist in cookie |
| Funnel shows 0% conversion because step events use different flow IDs | MEDIUM | Generate flow ID at funnel entry; pass through all steps; validate correlation |

## Done When

- Event tracking fires with typed taxonomy and consent management
- A/B testing assigns persistent variants with sample size calculation
- Funnel analysis tracks correlated steps with drop-off rates
- Dashboard renders KPI cards with comparison, time series, and export
- Server-side tracking proxy handles ad-blocked clients
- SQL queries use parameterized statements, proper indexing, and cursor-based pagination
- Data pipeline validates inputs with schema enforcement and anomaly detection
- Statistical tests applied correctly (right method for right question)
- Structured report emitted for each skill invoked

## Cost Profile

~8,000–14,000 tokens per full pack run (all 7 skills). Individual skill: ~2,000–4,000 tokens. Sonnet default. Use haiku for detection scans; escalate to sonnet for experiment design and dashboard patterns.

---
> **Rune Skill Mesh** — 58 skills, 200+ connections, 14 extension packs
> Source: https://github.com/rune-kit/rune (MIT)
> **Rune Pro** ($49 lifetime) — product, sales, data-science, support packs → [rune-kit/rune-pro](https://github.com/rune-kit/rune-pro)
> **Rune Business** ($149 lifetime) — finance, legal, HR, enterprise-search packs → [rune-kit/rune-business](https://github.com/rune-kit/rune-business)