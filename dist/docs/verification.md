# Verification record

Date: 2026-10-25. The application is static and uses no backend.

## Automated checks

`npm test` uses the Node built-in runner with no installed dependencies. The current English source passes 97 tests covering:

- Sliding-to-rolling transition, stopping distances, normal/side-spin cushion response, momentum and energy, pocket capture, swept collisions, dense packs and determinism.
- Route smoothing, retained endpoints, cushion signatures, arc-length sampling, angle wraparound, occlusion union and depth ordering.
- All four required grading boundaries, alternative routes, objectively better outcomes, illegal first contact/potting, actual simulated endpoints and unresolved inverse search.
- All 12 reference trajectories independently reproduced, with legal contact, no pots, rest, prescribed pre-contact cushions and target zones. Each reference scores 100/Excellent.
- Editor validation, physical limits, default-parameter reruns, invalid task rejection and complete recording.
- Edit invalidation, redraw, frozen controls during assessment, mode switching, replay/undo state and legacy progress migration.
- English-only built-in interface and lesson content, English HTML language metadata and correspondence between generated lessons and course definitions.

## Browser checks

The initial version was exercised in Chromium at desktop 1440×1000 and narrow 390×844 viewports. Actual actions covered shots, prediction, presets, drawing, point insertion/dragging, inversion, four-dimensional feedback, reference replay and editor save. The one-cushion route was physically reproduced and received Excellent. Screenshot assets in the current delivery are refreshed for the English build.

The English build was subsequently checked at effective document widths of 1800 px and 469 px under the browser’s existing zoom. The narrow layout had equal document and content widths, with no horizontal page overflow. Actual drawing, cushion-point editing and submission again produced a verified Excellent result with English coaching feedback. Free Table, editor controls and import/export messages were inspected in English. No new browser errors were recorded. The preview image shows the English puzzle view.

The standalone file embeds all nine scripts and its CSS. It requires no external font, image, CDN or application network request. Its JavaScript is syntax-checked and its release archive is checked for complete contents and ZIP integrity.

## Limits

- The in-app browser blocks file://. Direct double-click opening was not automated and no bypass was attempted. The same embedded standalone file is tested over local HTTP; source scripts are classic scripts, not server-dependent ES modules.
- A narrow viewport check is not a claim that every mobile browser or physical touch device has been tested.
- Published parameter ranges are a teaching baseline; professional real-table calibration has not been performed.
- Bounded inversion is not an impossibility proof. Geometric outcomes are not the paper’s probability certification or a global-optimality certificate.
- Pocket jaws, swerve, cloth nap and complex dense-pack/cushion dynamics remain simplified. Full referee and match rules are outside scope.
- Custom user-authored content is user data. Built-in content and interface language are English; imported text is not machine-translated.
