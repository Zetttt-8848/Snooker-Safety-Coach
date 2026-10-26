# Cushion model revision · 2026-10-26

## What was wrong

The previous engine changed along-rail velocity by `−0.4(v_t−Rω_z)` at the default setting. It did not bound friction by normal impact. Its energy-only limiter also allowed contact slip to pass through zero. Consequently a grazing impact could receive too much sideways impulse. For the regression fixture `v_normal=1`, `v_along=.14`, `Rω_z=.25` m/s, it reversed the along-rail component to −.016 m/s.

The revised result is approximately +.0188 m/s: the ball checks without reversing. This is one reproducible fixture, not a claim that reversal is always impossible. Near perpendicular incidence, sufficient reverse spin can physically overcome a small along-rail velocity.

## Source and derivation

[Mathavan, Jackson & Parkin (2010)](https://drdavepoolinfo.com/physics_articles/Mathavan_IMechE_2010.pdf), Eqs. (3), (4), (12)–(14), (16), provides the raised-nose contact and impulse/work formulation. [Dr. Dave’s bank and kick effects](https://drdavepoolinfo.com/faq/bank-kick/effects/) provides practical comparisons: running side lengthens a rebound, check side shortens it, and shallow impacts are less sensitive to side spin. [Pooltool’s author](https://ekiefl.github.io/2020/04/24/pooltool-theory/) explains why a reflection-angle adjustment alone is insufficient.

Use local x along the cushion, y into it, and z vertically. Let `s=(h−R)/R=.4`, `c=sqrt(1−s²)`, `I=2mR²/5`, and `j=P_normal/m`. The cushion normal acts through the sphere centre. Its tangent directions are x and `q=(0,−s,c)`. Contact slip is

```
u_x = v_x + s Rω_y − c Rω_z
u_q = −s v_y + Rω_x
u_bed = (v_x − Rω_y, v_y + Rω_x)
```

For a small positive normal-impulse increment dj, wall friction opposes `(u_x,u_q)` and obeys `hypot(j_x,j_q) ≤ μ_c dj`. The bed reaction is `j_bed,n = s dj − c j_q`; bed friction opposes `u_bed` with magnitude at most `μ_slide j_bed,n`. Linear and angular momentum give

```
Δv_x = j_x + j_bed,x
Δv_y = −c dj − s j_q + j_bed,y
RΔω_x = 2.5(j_q + j_bed,y)
RΔω_y = 2.5(s j_x − j_bed,x)
RΔω_z = −2.5c j_x
```

Compression ends at `v_y=0`. Store normal work `W_c = integral(c v_y dj)` and end restitution after returning `e² W_c`. A normal-speed multiplier cannot substitute for this energetic restitution when friction is present.

## Numerical implementation and checks

`src/physics.js` uses symmetric normal half-kicks around a coupled friction kick, accumulating the exact work of each normal kick. The impulse scale uses 512 subdivisions of the incoming normal momentum; the actual number of intervals varies with friction. Bisection locates compression and restitution endpoints. Near zero slip, each friction kick is limited to one sixth of its contact-slip speed. The coupled inverse-mass matrix has largest eigenvalue below 6, so that regularisation dissipates energy without an artificial energy-rescaling correction.

The test suite checks the reported reversal fixture, grazing impacts, opposite-spin symmetry, raised-nose spin changes, passive collisions at parameter extremes, frictionless restitution, and convergence against 4096 subdivisions. All 23 lesson references are regenerated and independently replayed; lesson objectives and acceptance thresholds are retained. Selected shots are retuned by a bounded search recorded in `scripts/calibrated-shots.json`.

## Parameters and limits

The starting values `μ_c=.14`, `e=.98` are reported for the published 3D contact model. They replace the old artificial tangential-retention and spin-gain sliders. They do **not** imply 98% retained horizontal speed. Existing cloth and ball settings survive migration; obsolete cushion settings reset to the new baseline.

This implementation has numerical and physical-invariant checks, not independent real-table validation. The source’s rigid-cushion approximation becomes less reliable at high normal speeds (roughly above 2.5 m/s). Cushion deformation, ball-to-ball tangential throw, swerve, jumps, cloth nap measured pocket templates and vertical pocket dynamics remain omitted. Calibrate against measured incoming/outgoing velocity and spin at several incidence angles before claiming a particular competition table’s behaviour.
