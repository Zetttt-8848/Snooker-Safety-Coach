# Verification record · 1.4.0

Audit date: 2026-10-26. The English seven-screen interface and 23-lesson course are retained.

## Automated checks

`npm test`: **174 tests pass**, zero failures. The 13 app-boot tests were also rerun after removing the floating badge that hid the brown.

- All four corners: 30, 45 and 60 degree approaches at .4, 1, 3 and 8 m/s ball speed, with no phantom cushion contact on a clean line.
- Both middle-pocket jaws, near-mouth passes, shallow versus normal entry, delayed throat capture and swept crossings between 1 ms ticks.
- The aim guide enters all six pockets without drawing a false cushion reflection.
- Exact inelastic normal-energy loss, no energy amplification of an initially stationary object ball, thin-hit transfer and the revised analytical stopping distance.
- Existing sliding/rolling, cushion symmetry, energy passivity, integration convergence, dense-pack, replay, geometry and four grading-boundary tests.
- All 23 regenerated references independently replay, meet their declared tasks and earn 100/Excellent. Cushion escapes use the advertised cushion faces in order, without relying on pocket jaws.
- Full 22-ball initial frame, white in the D, New frame reset, custom-settings preservation and migration of the previous stock drag.
- Safe-leave source selection, final-layout geometry, undo invalidation, potted-white restoration, authoring, progress and English-interface checks remain passing.

A further deterministic stress check (seed 140, 200 single-ball shots, cue speeds .4–4.4 m/s, varied aim and spin) found no balls escaping the pocket/cushion geometry and no unfinished trajectories. This is a numerical sample, not a proof over all inputs.

## Browser checks

The self-contained HTML was served locally and checked in the in-app browser at desktop (1440×1000) and phone (390×844) sizes. Verified:

- Full rack on initial load, 1.10 m/s opening power, all six colours visible.
- New frame cancels an in-progress shot, restores the rack and centre-ball spin, and clears the previous shot/review controls.
- Two-ball layout: angle −5.2 degrees with the Firm preset pots the red into the top-right corner; the interface reports “First hit: red · 0 cushions · Red potted”.
- Settings shows baseline rolling drag .014. Mobile mode buttons have accessible names and the page has no horizontal overflow.
- No console errors in the working preview tab.

Screenshots: `docs/screens/free-table-opening.png` and `docs/screens/free-table-mobile.png`.

## Release and cleanup

The builder recreates its owned dist directory, so deleted assets cannot linger. Superseded screenshots, screenshot automation, an unused break-off fixture and dead styling were removed. Old local archive/scratch files were sent to the Recycle Bin, keeping that cleanup recoverable. Git history retains earlier tracked releases. The current source, tests, reference data, standalone HTML, documentation and ZIP are the deliverables.

## Limits

The browser file:// policy prevented an automated direct-disk run in the previous audit; no alternate browser was used to bypass it. This release is checked for inline scripts/styles and no external runtime dependencies, and the same standalone HTML is exercised over HTTP. Real touch hardware, Safari, Firefox and screen readers were not tested.

The pocket model uses assumed rounded jaws and throat depths, not measured WPBSA templates. Vertical pocket bounce, cushion deformation, swerve, jumps, nap and ball-to-ball tangential throw are omitted. Physical invariant checks and literature-informed defaults are not independent real-table calibration. The safe-leave map remains sampled post-shot geometry, not a guaranteed reachable set or a return-probability certificate.
