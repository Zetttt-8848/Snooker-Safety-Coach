# Verification record · 1.3.0

Audit date: 2026-10-26. The designer's seven-screen interface and 23-lesson course are preserved.

## Current automated checks

The incoming redesign passed 153 tests before changes. The final suite contains 167 passing tests, using Node's built-in runner without installed dependencies.

- Sliding-to-rolling, stopping distance, swept contacts, momentum, deterministic replay and passive dense-pack behaviour.
- Revised cushion: frictionless restitution, artificial-reversal regression, bounded grazing response, opposite-spin symmetry, topspin changes, extreme-parameter energy dissipation, and convergence from 512 to 4096 impulse subdivisions.
- All 23 references regenerated and independently replayed: legal first target, no pots, stopped balls, exact cushion order, intended zones, hiding and separation. Every reference earns 100/Excellent.
- The four required grading boundaries and equivalent alternative routes; cancelled/unresolved searches never claim impossibility.
- Safe-leave geometry: paper distance law and .30 threshold, blocker depth, all legal reds, overlap/pocket exclusions, potted targets, final object positions and immutable input.
- UI regressions: diagonal tip limit, immediate angle entry, potted-white restoration, old-settings migration, review source switching, map hidden during replay, undo invalidation, and labelled reference-only maps for unresolved drawings.
- Existing geometry, authoring, storage, replay, course and English-interface tests remain.

Commands: `node scripts/generate-puzzles.js`, `npm test`, `npm run build`.

## Current browser checks

The standalone HTML is tested over the local static preview server in the in-app browser, at desktop and phone sizes. Checks cover route assessment, final-leave overlays, replay source switching, Free Table spin/angle controls, a potted white restored through Arrange balls, post-shot map review, and physics settings. Screenshots: `docs/screens/safe-leaves-desktop.png` and `docs/screens/safe-leaves-mobile.png`.

## Current limits

- The browser's file:// policy prevents an automated direct-disk run here. The release is checked for inline scripts/styles and no external runtime dependencies; the same standalone HTML is tested over HTTP. No alternate browser is used to circumvent the policy.
- The physics is literature-informed, without independent real-table calibration. Cushion deformation, swerve, jumps, nap, detailed jaws and ball-to-ball tangential throw remain omitted.
- The map is sampled geometry with final object balls fixed. It is not a reachable set, a return-probability certificate, protection against every pot, or the paper's complete defensive value.
- Real touch hardware, Safari, Firefox, screen readers and audio fidelity were not independently tested in this audit.

# Previous designer verification record · 1.2.0

The following is preserved from the incoming delivery. Its screenshots and file://, contrast and accessibility statements are historical, not a substitute for the current checks above.

Date: 2026-10-25. The application is static and uses no backend.

## Automated checks

`npm test` uses the Node built-in runner with no installed dependencies. 153 tests pass:

- **Physics (19):** sliding-to-rolling, stopping distance, cushion response, momentum and energy, pocket capture, swept collisions, dense packs, determinism.
- **Geometry (19):** smoothing, simplification, cushion signatures (including a bounce near a corner counting once), occlusion, and the new aim preview (cut angle, object-ball line, stun deflection, cushion mirror).
- **Scoring (30):** grading boundaries, alternative routes, legality protections, bounded route search, the closest-legal-shot tier, cancellation, progress reporting, and the plain-language explanations.
- **Route editor (16) and replay (9):** freehand strokes, snapping rules, handle and segment hit-testing, insert and remove, undo and redo, keyboard nudges, live cushion and first-contact summary; interpolation, trails, contact markers, clock, seeking and speed.
- **Course (34):** 23 lessons independently re-simulated; each reference earns 100/Excellent; levels never decrease in difficulty and each has at least three puzzles; every tactic and spin are present; hiding, escape, object-ball, screw-back and baulk-return outcomes are checked.
- **Store, course helpers and puzzle builder (10):** progress migration from the earlier-language release, best scores and grades, clamped settings, blocked and corrupt storage, presets inside range, course ordering and recommendations, Free Table capture to puzzle.
- **Editor (5) and English-only (2):** authoring validation and rejection of impossible puzzles; no non-English characters in the page, data or source, and generated lesson text matches its definitions.
- **App smoke test (9):** the real scripts, in `index.html` order, against a stand-in browser: all screens register, the library lists all lessons by level, a puzzle opens empty, an unknown puzzle redirects, a drawn route is checked on the real engine and recorded, results without a check redirect, drafts survive navigation, a Free Table shot finishes and is captured, and no shipped file contains non-English characters.

## Browser checks

- The built `dist/Snooker-Safety-Coach.html` was opened from disk (`file://`) in headless Edge by `scripts/capture-screens.js`, which walked Home, Puzzles, Practice (touch-style drawing, check), Results, Free table (shot), Create and Settings at 1440×900, then Home, Practice, Results and Free table at 390×844. It fails on any console error and reported none.
- In the in-app browser (served over HTTP): drawing, adding and removing points, keyboard editing, undo, hints, coach notes, the guide, library filters, checking, cancelling mid-search, a verified result, an "estimate" result, the Free Table shot and summary, the Create error message and save, Settings, and phone layouts. An accessibility sweep found every interactive element named, one H1 per screen and no target under 36 px. Colour contrast was computed for every text and background pair; the lowest is 4.8:1.

## Limits

- Real touch hardware and other browsers (Safari, Firefox) were not tested; Chromium-based Edge was. Touch was simulated with pointer events.
- The in-app browser blocks `file://`; the file build was therefore checked in headless Edge instead.
- The physics is a teaching baseline, not a calibration of a real table. A route search that finds no match is not proof of impossibility.
- Screen-reader behaviour was reasoned from the markup (labels, roles, live regions), not tested with a screen reader.
- Sound is synthesised in the browser and was not listened to in an automated run.
- Custom puzzle text typed by a user is not translated.
