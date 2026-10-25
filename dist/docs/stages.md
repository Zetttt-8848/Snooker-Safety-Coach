# Staged delivery

Each stage was runnable and checked before the next stage began.

1. **Table and physics:** sliding, rolling, cushions, collisions, pockets and a basic sandbox. Initial 13 physics tests and browser shot execution passed.
2. **Controls and presets:** physical units, tip control, prediction, replay and the full 22-ball setup checked in the browser.
3. **Drawing and comparison:** smoothing, simplification, cushion points, editing and dual-route rendering. Initial nine path tests and actual mouse drawing passed.
4. **Assessment:** geometry, four dimensions, three displayed labels, bounded inversion and coaching feedback. Geometry and scoring tests include the four required grading boundaries and legality protections.
5. **Course and editor:** 12 independently replayed lessons; 19 course tests and five editor tests. All reference routes score 100/Excellent. Actual browser authoring and saving passed.
6. **Persistence and delivery:** mode-switch regression checks, desktop/narrow layouts, standalone HTTP preview, preset save/load and editor checks passed. A zero-error feedback issue was corrected and tested.
7. **English handoff:** all built-in UI, lessons, feedback, errors, accessibility text and documentation translated. Legacy grade values migrate without losing attempts. The designer brief explicitly requires English-only delivery and local outputs, with all GitHub operations reserved for Codex.

The current suite contains 97 passing checks: physics 19, geometry 16, scoring 25, editor 5, UI/state 11, course 19 and English-language 2. Historical stage counts above describe those stages, not the current total. See `verification.md` for limits.
