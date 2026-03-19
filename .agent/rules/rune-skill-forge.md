# rune-skill-forge

> Rune L2 Skill | creation


# skill-forge

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

The skill that builds skills. Applies Test-Driven Development to skill authoring: write a pressure test first, watch agents fail without the skill, write the skill to fix those failures, then close loopholes until bulletproof. Ensures every Rune skill is battle-tested before it enters the mesh.

## Triggers

- `/rune skill-forge` — manual invocation to create or edit a skill
- Auto-trigger: when user says "create a skill", "new skill", "add skill to rune"
- Auto-trigger: when editing any `skills/*/SKILL.md` file

## Calls (outbound)

- `scout` (L3): scan existing skills for patterns and naming conventions
- `plan` (L2): structure complex skills with multiple phases
- `hallucination-guard` (L3): verify referenced skills/tools actually exist
- `verification` (L3): validate SKILL.md format compliance
- `journal` (L3): record skill creation decisions in ADR

## Called By (inbound)

- `cook` (L1): when the feature being built IS a new skill

## Workflow

### Phase 1 — DISCOVER

Before writing anything, understand the landscape:

1. **Scan existing skills** via `scout` — is this already covered?
2. **Check for overlap** — will this duplicate or conflict with existing skills?
3. **Identify layer** — L1 (orchestrator), L2 (workflow hub), L3 (utility)?
4. **Identify mesh connections** — what calls this? What does this call?

<HARD-GATE>
If a skill with >70% overlap already exists → extend it, don't create new.
The mesh grows stronger by deepening connections, not by adding nodes.
</HARD-GATE>

### Phase 2 — RED (Baseline Test)

**Write the test BEFORE writing the skill.**

Create a pressure scenario that exposes the problem the skill solves:

```markdown
## Pressure Scenario: [skill-name]

### Setup
[Describe the situation an agent faces]

### Pressures (combine 2-3)
- Time pressure: "This is urgent, just do it"
- Sunk cost: "I already wrote 200 lines, can't restart"
- Complexity: "Too many moving parts to follow process"
- Authority: "Senior dev says skip testing"
- Exhaustion: "We're 50 tool calls deep"

### Expected Failure (without skill)
[What the agent will probably do wrong]

### Success Criteria (with skill)
[What the agent should do instead]
```

Run the scenario with a subagent WITHOUT the skill. Document:
- **Exact behavior** — what did the agent do?
- **Rationalizations** — verbatim excuses for skipping discipline
- **Failure point** — where exactly did it go wrong?

<HARD-GATE>
You MUST observe at least one failure before writing the skill.
No failure observed = you don't understand the problem well enough to write the solution.
</HARD-GATE>

### Phase 3 — GREEN (Write Minimal Skill)

Write the SKILL.md addressing ONLY the failures observed in Phase 2.

Follow `docs/SKILL-TEMPLATE.md` format. Required sections:

| Section | Required | Purpose |
|---|---|---|
| Frontmatter | YES | Name, description, metadata |
| Purpose | YES | One paragraph, ecosystem role |
| Triggers | YES | When to invoke |
| Calls / Called By | YES | Mesh connections |
| Workflow | YES | Step-by-step execution |
| Output Format | YES | Structured, parseable output |
| Constraints | YES | 3-7 MUST/MUST NOT rules |
| Sharp Edges | YES | Known failure modes |
| Done When | YES | Verifiable completion criteria |
| Cost Profile | YES | Token estimate |
| Mesh Gates | L1/L2 only | Progression guards |

#### SKILL.md Anatomy — WHY vs HOW Split

A skill file answers WHY and WHEN — not HOW. Code examples, syntax references, and implementation patterns belong in separate files:

```
skills/[name]/
├── SKILL.md          ← WHY: purpose, triggers, constraints, sharp edges (~150-300 lines)
├── references/       ← HOW: code patterns, syntax tables, API examples
│   ├── patterns.md   ← Implementation patterns with code blocks
│   └── gotchas.md    ← Language/framework-specific pitfalls
└── scripts/          ← WHAT: deterministic operations (shell, node)
```

**Rules:**
1. SKILL.md MUST NOT contain code blocks longer than 10 lines — move to `references/`
2. One excellent inline example (≤10 lines) is OK for clarity — more than that is a smell
3. Format templates (Output Format section) are NOT code — they stay in SKILL.md
4. Pressure test scenarios (Phase 2) are NOT code — they stay in SKILL.md
5. If a skill has >3 code blocks → create `references/` and extract them

**Why this matters:** Code blocks in SKILL.md inflate context tokens on EVERY invocation. References are loaded only when needed. A 500-line SKILL.md with 200 lines of code examples should be a 300-line SKILL.md + a 200-line references file.

<HARD-GATE>
Code blocks in SKILL.md > 10 lines = review failure.
Extract to references/ or scripts/. No exceptions.
</HARD-GATE>

#### Frontmatter Rules

```yaml
---
name: kebab-case-max-64-chars    # letters, numbers, hyphens only
description: Use when [specific triggers]. [Symptoms that signal this skill applies].
metadata:
  layer: L1|L2|L3
  model: haiku|sonnet|opus       # haiku=scan, sonnet=code, opus=architecture
  group: [see template]
---
```

**Description rules (CSO Discipline):**
- MUST start with "Use when..."
- MUST describe triggering conditions, NOT workflow
- MUST be third person
- MUST NOT summarize what the skill does internally
- AI reads description → decides whether to invoke → if description contains workflow summary, AI skips reading the full SKILL.md content (it thinks it already knows)
- Test: if you can execute the skill from the description alone, the description leaks too much

Bad: "Analyzes code quality through 6-step process: scan files, check patterns, run linters, compare metrics, generate report, suggest fixes"
Good: "Use when code changes need quality review before commit. Symptoms: PR ready, refactor complete, pre-release check."

```yaml
# BAD: Summarizes workflow — agent reads description, skips full content
description: TDD workflow that writes tests first, then code, then refactors

# GOOD: Only triggers — agent must read full content to know workflow
description: Use when implementing any feature or bugfix, before writing code
```

**Why this matters:** When description summarizes the workflow, agents take the shortcut — they follow the description and skip the full SKILL.md. Tested and confirmed.

#### Writing Constraints

Every constraint MUST block a specific failure mode observed in Phase 2:

```markdown
# BAD: Generic rule
1. MUST write good code

# GOOD: Blocks specific failure with consequence
1. MUST run tests after each fix — batch-and-pray causes cascading regressions
```

#### Anti-Rationalization Table

Capture every excuse from Phase 2 baseline testing:

```markdown
| Excuse | Reality |
|--------|---------|
| "[verbatim excuse from test]" | [why it's wrong + what to do instead] |
```

### Phase 4 — VERIFY (Green Check)

Run the SAME pressure scenario from Phase 2, now WITH the skill loaded.

Check:
- Does the agent follow the skill's workflow?
- Are all constraints respected under pressure?
- Does the output match the defined format?

<HARD-GATE>
If agent still fails with skill loaded → skill is insufficient.
Go back to Phase 3, strengthen the weak section. Do NOT ship.
</HARD-GATE>

### Phase 5 — REFACTOR (Close Loopholes)

Run additional pressure scenarios with varied pressures. For each new failure:

1. Identify the rationalization
2. Add it to the anti-rationalization table
3. Add explicit constraint or sharp edge
4. Re-run verification

Repeat until no new failures emerge in 2 consecutive test runs.

#### Pressure Types for Test Scenarios

Best tests combine 3+ pressures simultaneously:

| Pressure | Example Scenario |
|----------|------------------|
| Time | "Emergency deployment, deadline in 30 min" |
| Sunk cost | "Already wrote 200 lines, can't restart" |
| Authority | "Senior dev says skip testing" |
| Economic | "Customer churning, ship now or lose $50k MRR" |
| Exhaustion | "50 tool calls deep, context filling up" |
| Social | "Looking dogmatic by insisting on process" |
| Pragmatic | "Being practical vs being pedantic" |

#### Scenario Quality Requirements

1. **Concrete A/B/C options** — force explicit choice (no "I'd ask the user" escape hatch)
2. **Real constraints** — specific times, actual consequences, named files
3. **Real file paths** — `/tmp/payment-system` not "a project"
4. **"Make agent ACT"** — "What do you do?" not "What should you do?"
5. **No easy outs** — every option has a cost

#### Meta-Testing (When GREEN Isn't Working)

If the agent keeps failing even WITH the skill loaded, ask: "How could that skill have been written differently to make the correct option crystal clear?"

Three possible responses:
1. "Skill was clear, I chose to ignore it" → foundational principle needed (stronger HARD-GATE)
2. "Skill should have said X explicitly" → add that exact phrasing verbatim
3. "I didn't see section Y" → reorganize for discoverability (move up, add header)

#### Bulletproof Criteria

A skill is bulletproof when:
- Agent chooses correct option under maximum pressure (3+ pressures combined)
- Agent CITES skill sections as justification for its choice
- Agent ACKNOWLEDGES the temptation but follows the rule anyway

#### Persuasion Principles for Skill Language

Research (Meincke et al., 2025, 28,000 conversations) shows 33% → 72% compliance with these techniques:

| Principle | Application | Use For |
|-----------|-------------|---------|
| Authority | "YOU MUST", imperative language | Eliminates decision fatigue, safety-critical rules |
| Commitment | Explicit announcements + tracked choices | Creates accountability trail |
| Scarcity | Time-bound requirements, "before proceeding" | Triggers immediate action |
| Social Proof | "Every time", universal statements | Documents what prevents failures |
| Unity | "We're building quality" language | Shared identity, quality goals |

**Prohibited in skills:**
- **Liking** ("Great job following the process!") → creates sycophancy
- **Reciprocity** ("I helped you, now follow the rules") → feels manipulative

**Ethical test**: Would this serve the user's genuine interests if they fully understood the technique?

### Phase 6 — INTEGRATE

Wire the skill into the mesh:

1. **Update `docs/ARCHITECTURE.md`** — add to correct layer/group table
2. **Update `CLAUDE.md`** — increment skill count, add to layer list
3. **Add mesh connections** — update SKILL.md of skills that should call/be called by this one
4. **Verify no conflicts** — new skill's output format compatible with consumers?

### Phase 7 — SHIP

```bash
git add skills/[skill-name]/SKILL.md
git add docs/ARCHITECTURE.md CLAUDE.md
# Add any updated existing skills
git commit -m "feat: add [skill-name] — [one-line purpose]"
```

## Skill Quality Checklist

**Format:**
- [ ] Name is kebab-case, max 64 chars, letters/numbers/hyphens only
- [ ] Description starts with "Use when...", does NOT summarize workflow
- [ ] All template sections present
- [ ] Constraints are specific (not generic "write good code")
- [ ] Sharp edges have severity + mitigation

**Content:**
- [ ] Baseline test run BEFORE skill was written
- [ ] At least one observed failure documented
- [ ] Anti-rationalization table from real test failures
- [ ] Mesh connections bidirectional (calls AND called-by both updated)
- [ ] Output format is structured and parseable by other skills

**Architecture:**
- [ ] Layer assignment correct (L1=orchestrate, L2=workflow, L3=utility)
- [ ] Model assignment correct (haiku=scan, sonnet=code, opus=architect)
- [ ] No >70% overlap with existing skills
- [ ] ARCHITECTURE.md updated
- [ ] CLAUDE.md updated

## Adapting Existing Skills

When editing, not creating:

<HARD-GATE>
Same TDD cycle applies to edits.
1. Write a test that exposes the gap in the current skill
2. Run baseline — confirm the skill fails on this scenario
3. Edit the skill to address the gap
4. Verify the edit fixes the gap WITHOUT breaking existing behavior
</HARD-GATE>

"Just adding a section" is not an excuse to skip testing.

## Token Efficiency Guidelines

Skills are loaded into context when invoked. Every word costs tokens.

| Skill Type | Target | Notes |
|---|---|---|
| L3 utility (haiku) | <300 words | Runs frequently, keep lean |
| L2 workflow hub | <500 words | Moderate frequency |
| L1 orchestrator | <800 words | Runs once per workflow |
| Reference sections | Extract to separate file | >100 lines → own file |

Techniques:
- Reference `--help` instead of documenting all flags
- Cross-reference other skills instead of repeating content
- One excellent example > three mediocre ones
- Inline code only if <50 lines, otherwise separate file

## Output Format

```
## Skill Forge Report
- **Skill**: [name] (L[layer])
- **Action**: CREATE | EDIT
- **Status**: SHIPPED | NEEDS_WORK | BLOCKED

### Baseline Test
- Scenario: [test scenario description]
- Result WITHOUT skill: [observed failure]
- Result WITH skill: [observed success or remaining gap]

### Quality Checklist
- Format: [pass/fail count]
- Content: [pass/fail count]
- Architecture: [pass/fail count]

### Files Created/Modified
- skills/[name]/SKILL.md — [created | modified]
- docs/ARCHITECTURE.md — [updated | skipped]
- CLAUDE.md — [updated | skipped]

### Mesh Impact
- New connections: [count] ([list of skills])
- Bidirectional check: PASS | FAIL
```

## Constraints

1. MUST run baseline test BEFORE writing skill — no skill without observed failure
2. MUST verify skill fixes the observed failures — green check required before ship
3. MUST NOT create skill with >70% overlap with existing — extend instead
4. MUST follow SKILL-TEMPLATE.md format — all required sections present
5. MUST update ARCHITECTURE.md and CLAUDE.md on every new skill
6. MUST NOT ship skill that fails its own pressure test
7. MUST write description as triggers only — never summarize workflow in description

## Sharp Edges

| Failure Mode | Severity | Mitigation |
|---|---|---|
| Writing skill without baseline test | CRITICAL | Phase 2 HARD-GATE: must observe failure first |
| Description summarizes workflow → agents skip content | HIGH | Phase 3 description rules: "Use when..." triggers only |
| New skill duplicates existing skill | HIGH | Phase 1 HARD-GATE: >70% overlap → extend, don't create |
| Skill passes test but breaks mesh connections | MEDIUM | Phase 6 integration: verify output compatibility |
| Editing skill without testing the edit | MEDIUM | Adapting section: same TDD cycle for edits |
| Overly verbose skill burns context tokens | MEDIUM | Token efficiency guidelines: layer-based word targets |
| Code blocks in SKILL.md bloat every invocation | HIGH | WHY vs HOW split: SKILL.md ≤10-line code blocks, extract rest to references/ |
| Writing skill without TDD (no observed failures first) | CRITICAL | Skill TDD: RED (run scenario WITHOUT skill → document failures) → GREEN (write skill targeting failures) → REFACTOR (find bypasses → add blocks) |
| Description leaks workflow → agent skips full content | HIGH | CSO Discipline: description = triggers only. Test: can you execute from description alone? If yes, it leaks too much |

## Done When

- Baseline test documented with observed failures (TDD RED phase)
- SKILL.md follows template format completely
- Skill passes pressure test (agent complies with skill loaded)
- No new failures in 2 consecutive varied-pressure test runs
- Mesh connections wired (ARCHITECTURE.md, CLAUDE.md, related skills)
- Git committed with conventional commit message

## Cost Profile

~3000-8000 tokens per skill creation (opus for Phase 2-5 reasoning, haiku for scout/verification). Most cost is in the iterative test-refine loop (Phase 4-5). Budget 2-4 test iterations per skill.

---
> **Rune Skill Mesh** — 58 skills, 200+ connections, 14 extension packs
> Source: https://github.com/rune-kit/rune (MIT)
> **Rune Pro** ($49 lifetime) — product, sales, data-science, support packs → [rune-kit/rune-pro](https://github.com/rune-kit/rune-pro)
> **Rune Business** ($149 lifetime) — finance, legal, HR, enterprise-search packs → [rune-kit/rune-business](https://github.com/rune-kit/rune-business)