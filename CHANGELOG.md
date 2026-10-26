# Changelog

## 1.4.0 — Full-frame start, pocket openings and controlled pace

- Free Table opens with all 22 balls in the break-off layout; New frame restores it and clears the previous shot and review.
- Removed the duplicate floating angle badge that obscured the brown in the opening layout; the angle remains in the Aim control.
- Replaced closed rectangular rail walls and circular pocket suction with finite cushions, round jaws and swept throat capture. Rendering and the aim guide use the same boundary model.
- Raised baseline rolling drag from .011 to .014, reduced the initial cue speed to 1.10 m/s and added gentler snooker power shortcuts. Previous stock settings migrate; custom cloth remains intact.
- Added pocket-entry, jaw, energy-transfer, stopping-distance and frame-reset regressions. Regenerated all 23 lessons, excluding jaw-assisted cushion escapes.
- Removed obsolete screenshot automation, superseded screenshots, migration scratch files, the old-language archive and an unused break-off fixture. Builds now recreate dist so stale assets cannot reappear.

## 1.3.0 — Cushion physics and post-shot safe leaves

- Replaced the unbounded tangential/side-spin adjustment with a raised-nose cushion model derived from Mathavan et al.: friction-limited impulses, spin/cloth coupling and energetic restitution. Replaced the artificial spin-gain settings and migrated old presets.
- Added review-only safe-leave maps from the supplied paper's Eqs. (37)/(38), with a separate colour for the author-approved occlusion extension. Maps use each replay's actual final object balls and all legal reds. Added Final leave and Free Table review controls.
- Regenerated all 23 reference trajectories; retained lesson objectives and acceptance thresholds. Strengthened generation to check cushion order as well as count.
- Fixed tip-point rounding beyond the physical limit, potted-ball restoration, stale summaries after arranging, angle entry waiting for focus changes, and delayed autoplay overriding replay controls.
- Added regression tests for cushion friction, symmetry, passivity, convergence, safe regions, state migration and review controls. See the current verification record for results and limits.

## 1.2.0 — Front-end redesign, 23-puzzle library, engine interaction upgrades

**Completed in this release**

Interface
- Rebuilt the front end as seven focused screens: Home, Puzzles, Practice, Results (with replay), Free table, Create and Settings. A first-time visitor sees an animated draw → test → learn demo and one clear button.
- New "clubhouse" visual identity: wood-framed table with brass pockets, lit cloth and shaded balls; serif headings; consistent colours (cyan = your route, gold = reference). All text meets WCAG AA contrast.
- Table-first teaching: balls are labelled on the table (Hit first, Hide behind, In the way), target areas pulse, the blocked view is drawn as a green/coral wedge, replays leave trails.
- Responsive layouts: side panels on wide screens, a bottom tab bar and pinned primary actions on phones.
- Every control has a specific label, a disabled-state reason or progress, and a visible focus ring. Keyboard route editing, one H1 per screen with focus management, live regions, reduced-motion and forced-colours support.
- First-visit guide (three animated steps), reopenable from "How it works".
- Settings: table-feel presets, physics fine-tuning, sound, colour labels, animation, replay speed, reset progress.

Puzzle library
- Grew from 12 to 23 puzzles in five levels with a tactic, a one-line goal and a learning objective each. New: three more hiding colours (green, pink, black), clearing a red from a pocket, new one-, two- and three-cushion escapes from all four cushions, two spin puzzles, a screw-back and a kick-clip-and-return. All reference shots are generated and verified by the shared engine; the tests re-simulate every one.

Drawing, aiming, scoring and replay
- Freehand strokes become a few numbered, editable points; tap the line to add one; undo and redo; keyboard nudging; live cushion and first-contact chips; wrong-ball warning before checking.
- Free table: drag-to-aim, cue stick, ghost-ball contact point, object-ball direction, stun deflection, cushion mirror line, power and spin presets, arrange mode with layouts, shot summary.
- Checking shows progress, can be cancelled, and the search is time-sliced so it never freezes the page. New "closest legal shot" tier plays imprecise but valid lines on the real engine instead of rejecting them. Early stop cut typical search time from ~0.9 s to ~0.2 s.
- Scores come with plain-language reasons; verified, equally safe alternative routes are recognised. Grading thresholds and formulas are unchanged.
- Replay: scrubber with contact markers, play/pause, 0.25×–2×, switch between your shot and the reference, layer toggles, synthesised sound.
- Create: verified on the standard table whatever table the shot was taken on; import, export, remove and restore.

Fixes found during the work
- A bounce near a corner was counted as two cushions; one bounce is now one cushion.
- Drawing used to snap every nearby point to the cushion, flattening shallow bounces and losing the contact.
- A migration table in the new storage code briefly contained non-English characters; it is back to ASCII escapes and a test guards all shipped files.

Quality
- 153 automated tests pass (up from 97), including a scripted run through the main journey and a check that no shipped file contains non-English characters.
- The built standalone file was opened from disk in a real browser, driven through the main journeys on desktop and phone sizes, and produced no console errors.

**Not done**: real-table calibration, a touch magnifier while drawing, and languages other than English (see docs/design.md).

## 1.1.0 — English delivery and designer handoff

- Consolidated the project in the requested `Snooker Safety Coach` folder.
- Translated the interface, all 12 built-in lessons, coaching feedback, validation messages, accessibility labels and documentation into English.
- Changed displayed assessment bands to Developing, Promising and Excellent, preserving their thresholds and alternative-route protections.
- Added compatibility for earlier stored grade values without losing attempt counts or best scores.
- Preserved all physical coordinates, shot parameters and acceptance conditions. Regenerated the course and independent reference evidence.
- Added language and progress-migration regression checks; the complete suite passes 97 tests.
- Added an English designer brief covering a simpler visual interface, separated task views, a larger course, usable controls, engine-interaction improvements and English-only delivery.
- Refreshed the standalone build and English preview. Earlier delivery and research scratch files remain local and are excluded from the release.

The major visual redesign, new screens and additional puzzles beyond the current 12 are the designer’s next assignment. This release provides the English baseline and brief; it does not claim that those future design changes are already implemented.
