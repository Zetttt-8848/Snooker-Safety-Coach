# Design notes (version 1.2)

What was designed, why, and how it maps to the code. Completed work only; ideas that are not built are listed at the end.

## Goals

A first-time visitor should understand what the app does and where to begin within seconds, mostly from pictures. Each task gets its own screen, every button says exactly what it does, and the table, not paragraphs, carries the teaching.

## Look and feel: "clubhouse"

- **Colour:** deep baize green background, walnut table frame, brass accent for the one primary action on each screen. Cyan is always *your* route; gold is always the *reference*; green means good or hidden; coral means blocked or wrong. Every text and background pair meets WCAG AA (lowest ratio 4.8:1).
- **Type:** a serif display face (Palatino/Georgia stack) for headings and numbers, a clean system sans for everything else. Body text 16.5–17 px, no text under 12.5 px. No web fonts, so the app stays offline and fast.
- **The table** is drawn with a wood-grain frame, brass-rimmed pockets, rail diamonds, lit cloth, shaded balls and optional colour letters. It is the largest element on every screen where it appears, and it never grows so tall that its controls fall off the screen.
- **Motion** explains rather than decorates: the home demo shows draw → test → learn, target areas pulse, replay trails fade in. All motion respects the system "reduce motion" setting, plus an explicit Settings choice.

## Screen map and the thinking behind each

| Screen | Decision |
|---|---|
| Home | One headline, one primary button, one animated example on the real engine. Three picture cards explain the loop. "Your path" shows the next puzzle and level progress. |
| Puzzles | Cards lead with a picture of the starting layout, then a one-line learning objective. Levels give a visible difficulty climb; tactic filters and "Hide mastered" keep it short. One card is marked **Up next**. |
| Practice | The goal is a single sentence beside the table. Balls on the table are labelled **Hit first**, **Hide behind** or **In the way**. A pulsing ring and bubble show where to start. Wide screens move the goal, steps and actions into a side panel so the table can be larger; phones get one thumb-reachable action bar. |
| Results | The verdict and next step come first. Each score has an icon, a number and one sentence of reason. The replay is a real player, not a video. |
| Free table | Aim, Power and Spin are three separate cards with presets. "Arrange balls" is a separate mode so placing balls never interferes with aiming. On phones **Take shot** stays pinned above the tab bar. |
| Create | Three decisions only: what the learner should do (picture-labelled choices), which ball is hit first, how big the target area is. The preview shows exactly what will be saved. |
| Settings | Presets before sliders; sliders sit behind "Fine-tune the physics"; the page says plainly that puzzles are always scored on the standard table. |

## Interaction details that matter

- **Drawing is forgiving.** A freehand stroke is reduced to a handful of numbered points (tolerance 2 cm) so there is something editable, and drawing never snaps to a cushion, because that flattens a shallow bounce and loses the contact. Dragging a point does snap to a cushion within 4.5 cm.
- **Direct manipulation.** Tap the line to insert a point and keep dragging; select a point to get a **Remove point** button beside it; right-click also removes. Hit areas grow for touch and pen.
- **Everything is undoable** and the redo branch is discarded only by a new action. Keyboard nudges group into one undo step.
- **Draft routes are kept** per puzzle for the visit, so going to Results, Settings or another puzzle never loses work.
- **Honest states:** disabled buttons say why (tooltip and helper text), checking shows progress and can be cancelled, and an unverified score is labelled as an estimate.
- **Accessibility:** one H1 per screen with focus moved to it on navigation, skip link, named controls, `aria-pressed` on toggles, live regions for feedback, visible focus rings, 44 px targets, keyboard route editing, native dialogs, forced-colours styles, no information carried by colour alone.

## Engine changes made for the interface

| Change | Why |
|---|---|
| Closest-legal-shot tier in the route search | Hand-drawn lines are rarely within 25 mm of a real trajectory; two of the original lessons (yellow and blue hiding) rejected slightly imprecise but valid lines after 200+ simulations. They are now played and scored on a real simulation, and labelled as such. |
| Time-sliced search with progress, cancel and early stop | The search used to yield every eight simulations, which freezes the page on a full rack. It now yields about every 10 ms, reports progress, honours cancel, and stops once a near-exact candidate is found (about 0.2 s instead of 0.9 s on the hiding puzzles). |
| First-vertex aiming candidate | Aiming straight at the first cushion point beats following the first 12 cm of a wobbly line. |
| One bounce vertex = one cushion | A bounce near a corner was counted on two cushions and broke the cushion-order match for a valid line. |
| Explanations and recognised alternatives | Each score has a plain sentence; a verified, equally safe different route is flagged rather than treated as a near miss. Grading thresholds are unchanged. |
| Aim preview geometry | Ghost-ball contact, cut angle, object-ball direction, stun deflection and the cushion mirror line for the Free Table. |
| Replay sampler and player | Interpolated state at any time, trails, contact markers, speed control and a scrubber, driven by one clock. |

## Library design

Five levels climb from single contacts and a gentle cushion leave to three-cushion escapes and the break-off. Variety comes from five tactics, every cushion combination (left, right, top and bottom first), blockers on different spots and sides, spin, and object-ball safety. Positions and shots for the new puzzles were found by seeded, bounded searches over the engine, then re-simulated and checked by the generator (`scripts/generate-puzzles.js`), so none rests on an unchecked number.

## Not done

- Real-table calibration of the physics (still a teaching baseline).
- A touch magnifier while drawing on small phones.
- Per-puzzle best-route ghost from the learner's own earlier attempts.
- Languages other than English.
