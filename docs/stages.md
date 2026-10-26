# Staged delivery

Each stage was runnable and checked before the next began.

1. **Table and physics** (earlier releases): sliding, rolling, cushions, collisions, pockets, sandbox.
2. **Controls, drawing, assessment, course, editor and English handoff** (earlier releases): see the 1.1.0 entry in the changelog.
3. **Engine interaction layer (1.2.0):** route editor with undo, replay clock, aim-preview geometry, explanations, closest-legal-shot search, time-sliced and cancellable search. Each has its own tests.
4. **Library (1.2.0):** 11 new puzzles from seeded searches over the engine, then verified by the generator; metadata for all 23.
5. **Interface (1.2.0):** renderer, router, seven screens, styling, guide. Checked at desktop and phone sizes in a real browser.
6. **Release (1.2.0):** standalone build, file:// run with zero console errors, screenshots, documentation.

7. **Physics and paper review (1.3.0):** raised-nose cushion model, paper exposure map, control fixes, regenerated references, desktop and phone review checks.

The current suite holds 167 passing tests. See verification.md for the audit evidence and limits. The 1.2.0 browser statements above describe the earlier designer delivery.
