# rune-ext-gamedev

> Rune L4 Skill | extension


# @rune/gamedev

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

Web game development hits performance walls that traditional web apps never encounter: 60fps render loops that stutter on garbage collection, physics simulations that diverge between clients, shaders that work on desktop but fail on mobile GPUs, and asset loading that blocks the first frame for 10 seconds. This pack provides patterns for the full web game stack — rendering, simulation, physics, assets, multiplayer, audio, input, ECS, particles, camera, and scene management — each optimized for the unique constraints of real-time interactive applications running in a browser.

## Triggers

- Auto-trigger: when `three`, `@react-three/fiber`, `pixi.js`, `phaser`, `cannon`, `rapier`, `*.glsl`, `*.wgsl` detected
- `/rune threejs-patterns` — audit or optimize Three.js scene
- `/rune webgl` — raw WebGL/shader development
- `/rune game-loops` — implement or audit game loop architecture
- `/rune physics-engine` — set up or optimize physics simulation
- `/rune asset-pipeline` — optimize asset loading and management
- `/rune multiplayer` — WebSocket game server and client prediction
- `/rune audio-system` — Web Audio API, spatial audio, SFX management
- `/rune input-system` — keyboard/mouse/gamepad/touch input handling
- `/rune ecs` — Entity Component System architecture
- `/rune particles` — GPU particle system with WebGL
- `/rune camera-system` — follow camera, screen shake, zoom
- `/rune scene-management` — scene transitions, preloading, serialization
- Called by `cook` (L1) when game development task detected

## Skills Included

| Skill | Model | Description |
|-------|-------|-------------|
| [threejs-patterns](skills/threejs-patterns.md) | sonnet | Three.js scene, React Three Fiber, PBR materials, LOD, post-processing, instanced rendering, and disposal patterns. |
| [webgl](skills/webgl.md) | sonnet | Raw WebGL2, GLSL shaders, VAO buffer management, instanced rendering, and texture handling. |
| [game-loops](skills/game-loops.md) | sonnet | Fixed timestep with accumulator, interpolation for smooth rendering, decoupled input handler, and frame budget monitoring. |
| [physics-engine](skills/physics-engine.md) | sonnet | Rapier.js (WASM) setup with collision groups, sleep thresholds, event-driven collision callbacks, and raycasting. |
| [asset-pipeline](skills/asset-pipeline.md) | sonnet | glTF/Draco loading, KTX2 texture compression, typed asset manifest, preloader with progress tracking. |
| [multiplayer](skills/multiplayer.md) | sonnet | Authoritative WebSocket game server, client-side prediction, reconciliation, entity interpolation, and lag compensation. |
| [audio-system](skills/audio-system.md) | sonnet | Web Audio API AudioManager — spatial audio, music crossfade, SFX pooling, browser autoplay policy handling. |
| [input-system](skills/input-system.md) | sonnet | Unified keyboard/mouse/gamepad/touch input with action mapping, input buffering, coyote time, and virtual joystick. |
| [ecs](skills/ecs.md) | sonnet | Lightweight archetype-based ECS — dense component storage, query-based entity iteration, and pure system functions. |
| [particles](skills/particles.md) | sonnet | Object-pooled CPU particle system with WebGL instancing path for 10k+ particles and emitter presets. |
| [camera-system](skills/camera-system.md) | sonnet | 2D camera with smooth lerp follow, dead zone, screen shake decay, and zoom-to target. |
| [scene-management](skills/scene-management.md) | sonnet | Stack-based SceneManager with fade transitions, asset preloading before enter, and level JSON serialization. |

## Common Workflows

| Workflow | Skills Involved | Typical Trigger |
|----------|----------------|----------------|
| 2D platformer bootstrap | game-loops → physics-engine → input-system → camera-system | new Phaser/PixiJS project |
| 3D world with NPCs | threejs-patterns → ecs → physics-engine → camera-system | Three.js/R3F project |
| Multiplayer action game | game-loops → multiplayer → physics-engine → input-system | real-time PvP feature |
| Mobile game port | asset-pipeline → input-system → camera-system → game-loops | add touch controls |
| VFX & atmosphere | particles → webgl → threejs-patterns → audio-system | visual polish sprint |
| Game level editor | scene-management → asset-pipeline → ecs → camera-system | tooling sprint |
| Performance audit | game-loops → webgl → particles → asset-pipeline | frame rate complaints |

## Cross-Pack Connections

| Target Pack | Connection | Use Case |
|-------------|-----------|----------|
| **@rune/ui** | HUD components, inventory screens, pause menus, leaderboard overlays | Health bars, minimap, skill cooldowns, settings modal |
| **@rune/backend** | REST/WebSocket API for leaderboards, save data, player accounts, matchmaking | POST `/scores`, GET `/leaderboard`, save game state to DB |
| **@rune/analytics** | Player telemetry — session length, death locations, skill usage heatmaps | `analytics.track('player_died', { x, y, cause })` |
| **@rune/ai-ml** | NPC behavior trees, pathfinding ML, procedural content, cheat detection | A* pathfinding, trained NPC models, PCG level generation |

## Connections

```
Calls → perf (L2): frame budget and rendering performance audit
Calls → asset-creator (L3): generate placeholder assets and sprites
Calls → @rune/ui: HUD, inventory, menus, overlays
Calls → @rune/backend: leaderboards, save data, player accounts, matchmaking
Calls → @rune/analytics: player telemetry and session tracking
Calls → @rune/ai-ml: NPC behavior, procedural content, cheat detection
Called By ← cook (L1): when game development task detected
Called By ← review (L2): when game code under review
```

## Tech Stack Support

| Engine | Rendering | Physics | ECS |
|--------|-----------|---------|-----|
| Three.js | WebGL2 / WebGPU | Rapier.js (WASM) | bitECS |
| React Three Fiber | Three.js (declarative) | @react-three/rapier | Custom |
| PixiJS | WebGL2 (2D) | Matter.js | Custom |
| Phaser 3 | WebGL / Canvas | Arcade / Matter | Built-in |
| Babylon.js | WebGL2 / WebGPU | Havok (WASM) | Built-in |

## Constraints

1. MUST use fixed timestep for physics — variable timestep causes non-deterministic simulation.
2. MUST dispose all GPU resources (geometries, textures, materials) on scene teardown — GPU memory leaks crash tabs.
3. MUST NOT create objects inside the render loop — allocate outside, reuse inside.
4. MUST test on target minimum hardware (mobile GPU) not just development machine.
5. MUST use compressed asset formats (Draco for geometry, KTX2/Basis for textures) — raw assets cause unacceptable load times.
6. MUST use authoritative server model for multiplayer — never trust client position data.
7. MUST resume AudioContext on user gesture — browsers block autoplay audio.
8. MUST call `input.flush()` at end of each fixed tick — prevents justPressed persisting across frames.

## Sharp Edges

| Failure Mode | Severity | Mitigation |
|---|---|---|
| Objects created in useFrame/render loop cause GC stutters at 60fps | CRITICAL | Pre-allocate all vectors, quaternions, matrices outside the loop; reuse with `.set()` |
| GPU memory leak from undisposed textures/geometries (tab crashes after 5 minutes) | CRITICAL | Implement disposal manager; call `.dispose()` on every Three.js resource on unmount |
| Physics spiral of death: update takes longer than frame, accumulator grows unbounded | HIGH | Cap accumulator at 250ms (skip frames); reduce physics complexity if consistent |
| Shader compiles on first use causing frame drop (shader cache miss) | MEDIUM | Pre-warm shaders during loading screen; use `renderer.compile(scene, camera)` |
| Asset loading blocks first frame (white screen for 5+ seconds) | HIGH | Implement progressive loading with preloader UI; prioritize visible assets |
| Mobile GPU fails on desktop-quality shaders (WebGL context lost) | HIGH | Detect GPU tier with `detect-gpu`; provide shader LOD variants |
| Multiplayer client trusts own position — speed hack trivial | CRITICAL | Server is authoritative; client sends inputs only, reconciles with server state |
| AudioContext locked until user gesture — no music on load | MEDIUM | Resume AudioContext in first click/keydown handler; show muted indicator |
| Gamepad axes not zeroed when gamepad disconnects | LOW | Set axes to 0 in gamepaddisconnected handler |
| Input justPressed persists to next frame if flush() skipped | HIGH | Always flush at end of fixed update, not render |

## Done When

- Scene renders at stable 60fps on target hardware
- Physics simulation is deterministic with fixed timestep
- All GPU resources properly disposed on cleanup
- Assets compressed and preloaded with progress indicator
- Game loop decouples update from render with interpolation
- Multiplayer: server authoritative, client predicts + reconciles
- Audio: spatial SFX + crossfade music, resumable after user gesture
- Input: keyboard/mouse/gamepad/touch unified, buffered, rebindable
- ECS: entities/components/systems cleanly separated, query-based
- Particles: pooled, no GC spikes, emitter presets for common FX
- Camera: smooth follow, dead zone, screen shake on impact
- Scenes: transition with fade, preload assets before enter
- Performance: quadtree spatial queries, frame budget monitoring active
- Structured report emitted for each skill invoked

## Cost Profile

~10,000–20,000 tokens per full pack run (all skills). Individual skill: ~2,000–4,000 tokens. Sonnet default. Use haiku for asset detection scans and grep passes; sonnet for physics config, shader optimization, and multiplayer architecture; escalate to opus for full game architecture decisions spanning multiple systems.

---
> **Rune Skill Mesh** — 58 skills, 200+ connections, 14 extension packs
> Source: https://github.com/rune-kit/rune (MIT)
> **Rune Pro** ($49 lifetime) — product, sales, data-science, support packs → [rune-kit/rune-pro](https://github.com/rune-kit/rune-pro)
> **Rune Business** ($149 lifetime) — finance, legal, HR, enterprise-search packs → [rune-kit/rune-business](https://github.com/rune-kit/rune-business)