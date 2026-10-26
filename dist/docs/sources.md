# Sources and transfer to teaching

Original source review: 2026-10-25. Cushion sources (Mathavan, Dr. Dave, pooltool author) rechecked online on 2026-10-26 for the physics revision. These primary rules, research, author tutorials and official product pages support the implementation. The supplied paper is mapped separately in `paper-model.md`.

## Dimensions and rules

The [WPBSA rules page](https://www.wpbsa.com/rules/) links the [2024–25 rulebook](https://www.wpbsa.com/wp-content/uploads/2198_WPBSA-Rulebook-2024-25.pdf). Printed pages 7–8 (PDF pages 11–12) specify a 3569×1778 mm playing area with ±13 mm tolerance, 52.5±0.05 mm ball diameter, ball-set weight difference no greater than 3 g, a 737 mm baulk line and 292 mm D radius. Brown is at baulk centre, green/yellow at the D ends, blue at table centre, pink midway between blue and the top cushion, and black 324 mm from the top cushion.

The rulebook describes six pocket positions but does not prescribe fixed 89/102 mm pocket widths or 142 g ball mass. Those values are project modelling approximations, not current fixed WPBSA requirements.

## Physics

| Source | Evidence and use |
|---|---|
| [Dr. Dave: Pool Physics Property Constants](https://drdavepoolinfo.com/faq/physics/physical-properties/) | Compiles ball restitution .92–.98, rolling resistance .005–.015, sliding friction .15–.4 (typical .2), cushion restitution .6–.9, spin decay 5–15 rad/s² and solid-sphere inertia 2mR²/5. These establish plausible ranges, not snooker-table calibration. |
| [Mathavan, Jackson & Parkin (2010)](https://journals.sagepub.com/doi/10.1243/09544062JMES1964), [full-text mirror](https://drdavepoolinfo.com/physics_articles/Mathavan_IMechE_2010.pdf) | Models 3D cushion impulse, slip and rotation. Its e=.98 and friction .14 belong to that contact model, with an approximately 2.5 m/s normal-speed applicability limit when cushion deformation is neglected. These are not drop-in replacements for a simplified 2D effective restitution. |
| [Evan Kiefl: The physics of pool/billiards](https://ekiefl.github.io/2020/04/24/pooltool-theory/) | The pooltool author derives sliding, rolling, spinning, ball and cushion interactions and discusses Marlow, Han and Mathavan models. Supports contact-slip friction and sliding-to-rolling transition. |
| [pooltool v0.3.3 ball parameters](https://pooltool.readthedocs.io/en/v0.3.3/autoapi/pooltool/objects/ball/params/index.html) | Example defaults include sliding .2, rolling .01 and cushion restitution .85. Model-specific values are cross-checks; pool dimensions and mass are not reused as snooker standards. |
| [pooltool physics models](https://pooltool.readthedocs.io/en/latest/autoapi/pooltool/physics/index.html) | Multiple ball/cushion models coexist, including Han and Mathavan. No single cushion coefficient describes every model or table. |
| [tailuge/billiards](https://github.com/tailuge/billiards) | Browser simulation including snooker and three-cushion. Used as an architectural reference; no third-party implementation code was copied. |
| [Rod Cross: Billiards](https://physics.usyd.edu.au/~cross/Billiards.htm) | Supports momentum, near-elastic collision geometry and slip/spin behaviour, not a fixed professional cushion coefficient. |
| [Rod Cross: Enhancing the Bounce of a Ball](https://physics.usyd.edu.au/~cross/PUBLICATIONS/48.%20EnhanceBounce.pdf) | General oblique-impact and rotational coupling background. Experiments with golf balls/rubber do not provide snooker material constants. |

Marlow’s *The Physics of Pocket Billiards* was cross-checked through the pooltool author’s references; the complete book was not obtained or read. Secondary citations are not presented as fresh original measurements. The specialised cushion reference here is Mathavan et al.; Cross is supplementary background.

### Preset limits

The revised cushion model uses raised-nose contact, both friction contacts and an energetic restitution rule. Its starting cushion friction is .14 and energetic restitution .98; see [the derivation and numerical checks](cushion-model.md). The old .70 horizontal-speed restitution, .60 tangential retention and artificial side-spin multiplier have been retired. Sliding .20, ball restitution .94 and gravity 9.81 m/s² remain. Version 1.4.0 raises the teaching baseline rolling resistance from .011 to .014, within Dr. Dave's approximate .005–.015 range. These are literature-informed starting values, not measurements of the user's table.

Calibrate rolling resistance from known rolling speed/stopping distance using mu_roll≈v²/(2gs), then fit the cushion model to measured velocities and spin before and after impact at several angles. Do not substitute a horizontal rebound-speed ratio for energetic restitution. [Dr. Dave's bank/kick effects](https://drdavepoolinfo.com/faq/bank-kick/effects/) supports the qualitative running/check-side and shallow-angle checks. Independent real trajectories are needed before making table-specific predictive claims. Jumps, masse, nap, complex pocket jaws and cushion deformation are outside this model.

## Safety and escape coaching

| Source | Transfer to this course |
|---|---|
| [Cuestars: Safety practice set](https://www.cuestarsacademy.co.uk/safety-practice-set/) | Direct snooker examples cover returning to baulk, clipping reds, cross doubles, safe zones, figure-of-eight and break-off. Assess both cue-ball and red-ball finishes. |
| [The Snooker Gym: 1.2.3’s of Snooker](https://www.thesnookergym.com/123s-of-snooker) | Covers safety, break-off, cushion shots and escaping snookers. Supports a progression by skill; unpublished video details are not inferred from a course description. |
| [The Snooker Gym: Coaching Skills](https://www.thesnookergym.com/coaching-skills) | Escape geometry and safety selection support separating route choice, contact points and speed into practice steps. |
| [Dr. Dave: Mirror Kick and Bank Shot Aiming](https://drdavepoolinfo.com/faq/bank-kick/mirror/) | Mirror geometry is a starting direction; speed, cushion distance and conditions need compensation. References are generated by physics, not drawn ideal reflections. |
| [Dr. Dave: Diamond Systems](https://drdavepoolinfo.com/FAQ/bank-kick/diamond-systems/) | One-cushion mirror, two-cushion Plus and three-cushion Corner-5 ideas inform hints. Pool diamond values are not declared snooker standards. |
| [Dr. Dave: Safeties You Must Master (2020)](https://drdavepoolinfo.com/bd_articles/2020/sept20.pdf) | Thin-hit hiding, separation near long cushions, entry along the blocking line and moving object balls away inform spatial teaching. These are pool examples transferred with legal snooker first contact; jump tactics are excluded. |

Being closer to a cushion is not always safer. Some layouts make an object ball roughly one ball-width off a cushion easier to reach. Task zones therefore depend on pockets, obstruction, distance and legal contact.

## Game interaction references

| Official source | Design reference |
|---|---|
| [Miniclip: How to Aim with the Cue](https://support.miniclip.com/hc/en-us/articles/203747546-How-to-Aim-with-the-Cue-8-Ball-Pool) | Fine aiming and drag-based power control inform clear separation of direction and speed. Commercial cue upgrades are not copied. |
| [8 Ball Pool: Cue Stats](https://8ballpool.com/news/pro-tips-cue-stats) | Force, Aim, Spin and Time describe interaction dimensions, not physical calibration ground truth. |
| [ShootersPool: Billiards Training Tool](https://www.shooterspool.net/training-billiards-tool.php) | Layout editing, condition-dependent prediction, slow replay, presets and custom exercises support the Free Table and editor. Prediction stays off before puzzle submission. |
| [Virtual Pool 4: Control Reference](https://vponline.celeris.com/support/view/id/19) | Aim, tip-position and mouse-speed stroke controls inform the 2D tip control with a combined radial offset limit. |
| [Virtual Pool 4: Quick Start](https://vponline.celeris.com/support/quickstart) | Overhead viewing, positioning and cue controls support a desktop-first 2D interaction model. |

## Paper boundary

Equation (37) remains a binary line-clearance factor times distance decay. The continuous delta_occ angle is an author-approved teaching extension. Neither it nor a reproducible reference route is a certified professional escape probability or global optimum.

## Pocket and pace review · 2026-10-26

[Physical property ranges](https://drdavepoolinfo.com/faq/physics/physical-properties/) and [pocket effective size and centre](https://drdavepoolinfo.com/faq/pocket/size-and-center/) were rechecked online. The finite cushions, rounded jaws, throat capture, stopping distances and energy checks are specified in [pockets-and-energy.md](pockets-and-energy.md). Jaw shape and throat depths are modelling assumptions, not measured WPBSA templates.
