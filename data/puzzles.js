globalThis.Coach=globalThis.Coach||{};globalThis.Coach.puzzles=[
  {
    "id": "rail-touch",
    "title": "A gentle cushion leave",
    "category": "0 cushions · Control",
    "difficulty": "Beginner",
    "paperClass": "near-cushion",
    "targetId": "red1",
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 2,
        "y": 0.06
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.35,
        "y": 0.06
      }
    ],
    "referenceShot": {
      "angle": 0,
      "cueSpeed": 0.45,
      "top": 0,
      "side": 0
    },
    "objective": {
      "type": "rail",
      "cueZone": {
        "x": 2.35,
        "y": 0.06,
        "radius": 0.18
      },
      "targetZone": {
        "x": 2.65,
        "y": 0.08,
        "radius": 0.2
      }
    },
    "acceptance": {
      "cueCushions": 0,
      "maxCueRailDistance": 0.04,
      "minTargetPocketDistance": 0.4
    },
    "task": "Touch the red gently and leave the cue ball near the top cushion, behind the red.",
    "goal": "Hit the red first, use no cushions, finish within 4 cm of the long cushion and leave the red in the right-hand safe area.",
    "explanation": "Control the speed left in the cue ball. A cushion leave restricts the next stroke, but is not automatically safe. Check that the red stays away from a pocket. This shot needs only a gentle push.",
    "source": "Paper pp. 14–16, Eqs. (34)–(37), near-cushion benchmark; Dr. Dave, Safeties You Must Master (2020), long-cushion safety.",
    "hint": "Start along the cue-to-red line and plan a finish in the narrow strip by the long cushion.",
    "level": 1,
    "tactic": "control",
    "brief": "Tap the red, then stop on the long cushion.",
    "learn": "Control pace so the white stops where you plan.",
    "focus": {
      "id": "red1",
      "label": "Hit first",
      "role": "target"
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.7291733076905995,
      "cueRailDistance": 0.03375,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.23688288132749014,
      "targetTravel": 0.2295908383766032,
      "targetPocketDistance": 0.797351516754317,
      "pocketDistanceGain": 0.22867740093753386,
      "cueInBaulk": false,
      "redTotalTravel": 0.2295908383766032
    }
  },
  {
    "id": "thin-separation",
    "title": "Thin contact, more distance",
    "category": "Thin safety · Separation",
    "difficulty": "Beginner",
    "paperClass": "open",
    "targetId": "red1",
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1.1,
        "y": 0.9
      },
      {
        "id": "red1",
        "color": "red",
        "x": 1.55,
        "y": 0.9
      }
    ],
    "referenceShot": {
      "angle": 6.5,
      "cueSpeed": 0.6,
      "top": 0.1,
      "side": -0.1
    },
    "objective": {
      "type": "distance",
      "cueZone": {
        "x": 2.45,
        "y": 1.35,
        "radius": 0.24
      },
      "targetZone": {
        "x": 1.65,
        "y": 0.8,
        "radius": 0.18
      }
    },
    "acceptance": {
      "minSeparation": 0.9,
      "maxTargetTravel": 0.18
    },
    "task": "Clip the lower edge of the red and send the cue ball towards the bottom right, moving the red as little as possible.",
    "goal": "Hit the red first; separate the balls by at least 90 cm while moving the red no more than 18 cm.",
    "explanation": "A thin contact transfers less normal momentum to the red and leaves more travel in the cue ball. Follow the post-contact direction rather than drawing one straight line. Check that the red also finishes safely.",
    "source": "Paper p. 4, p. 15 Eq. (35), pp. 20–22; Cuestars Safety: Clipping the Reds; Dr. Dave (2020), Thin-Hit Hide.",
    "hint": "Aim near the lower edge of the red, leaving room for the cue ball to run towards the bottom right.",
    "level": 1,
    "tactic": "control",
    "brief": "Clip the edge of the red and send the white far away.",
    "learn": "A thin contact keeps the pace in the white ball.",
    "focus": {
      "id": "red1",
      "label": "Clip this",
      "role": "target"
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.2739993658750978,
      "cueRailDistance": 0.5319373395602423,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.970972115190904,
      "targetTravel": 0.030518139406851073,
      "targetPocketDistance": 0.8996970469825604,
      "pocketDistanceGain": -0.009079190602908072,
      "cueInBaulk": false,
      "redTotalTravel": 0.030518139406851073
    }
  },
  {
    "id": "pull-red-clear",
    "title": "Clear the red from the pocket",
    "category": "Object ball · Safe zone",
    "difficulty": "Beginner",
    "paperClass": "near-cushion",
    "targetId": "red1",
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 2.45,
        "y": 0.25
      },
      {
        "id": "red1",
        "color": "red",
        "x": 1.62,
        "y": 0.2
      }
    ],
    "referenceShot": {
      "angle": 186.19040063023567,
      "cueSpeed": 1.2023344257846476,
      "top": -0.015419709356501693,
      "side": -0.044528318848460896
    },
    "objective": {
      "type": "target",
      "cueZone": {
        "x": 0.125,
        "y": 0.403,
        "radius": 0.3
      },
      "targetZone": {
        "x": 0.897,
        "y": 1.042,
        "radius": 0.25
      }
    },
    "acceptance": {
      "minTargetPocketDistance": 0.65,
      "minPocketDistanceGain": 0.5,
      "minSeparation": 0.8
    },
    "task": "The red sits close to the top middle pocket. Hit it from the right so it travels well away from every pocket.",
    "goal": "Hit the red first, pot nothing and leave the red at least 65 cm from every pocket.",
    "explanation": "A safety is also about where the object ball finishes. Moving the red out of pocket range matters as much as where the white stops. A gentle, slightly cut contact sends the red away without sending the white after it.",
    "source": "Paper pp. 5–6 and 20–22, residual opportunity; Cuestars Safety: Cross Double safe-zone practice.",
    "hint": "Cut the red a little so it rolls down and to the left, away from the middle pocket.",
    "level": 1,
    "tactic": "object",
    "brief": "Knock the red away from the pocket.",
    "learn": "Judge where the red goes, not only the white.",
    "focus": {
      "id": "red1",
      "label": "Move this",
      "role": "target"
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [
        "top"
      ],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.3221044777160477,
      "cueRailDistance": 0.0762470018224675,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.849659490831322,
      "targetTravel": 0.9461268334071413,
      "targetPocketDistance": 1.2033606702461745,
      "pocketDistanceGain": 0.9444007312594658,
      "cueInBaulk": true,
      "redTotalTravel": 0.9461268334071413
    }
  },
  {
    "id": "hide-brown",
    "title": "Behind the brown",
    "category": "Snooker · Brown",
    "difficulty": "Foundation",
    "paperClass": "open → screened",
    "targetId": "red1",
    "objective": {
      "type": "snooker",
      "cueZone": {
        "x": 0.6,
        "y": 0.82,
        "radius": 0.12
      }
    },
    "acceptance": {
      "minBlockedFraction": 0.95
    },
    "task": "Clip the red, then leave the cue ball in the hiding area to the left of the brown on its official spot.",
    "goal": "Hit the red first, return towards baulk and let the brown block at least 95% of the red’s contact directions.",
    "explanation": "Watch the landing window behind the brown. A small speed change can expose the edge of the red again. The continuous occlusion angle is a teaching extension, not a probability from the paper.",
    "source": "Paper pp. 14–16, Eq. (37), exposure proxy; approved occlusion-angle extension; Dr. Dave: entering a safety zone along the blocking line.",
    "hint": "After contact with the red, aim to finish to the left of the brown. Do not hit the brown directly.",
    "level": 2,
    "tactic": "hide",
    "brief": "Clip the red, then hide the white behind the brown.",
    "learn": "Use a ball on its spot to block the red.",
    "focus": {
      "id": "brown",
      "label": "Hide behind",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 0.7827123672989782,
        "y": 0.1973232332130943
      },
      {
        "id": "red1",
        "color": "red",
        "x": 0.7827123672989782,
        "y": 0.6473232332130943
      },
      {
        "id": "brown",
        "color": "brown",
        "x": 0.737,
        "y": 0.889
      }
    ],
    "referenceShot": {
      "angle": 93,
      "cueSpeed": 0.6,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "verified-track-clear-colour-on-official-spot",
      "baseShot": {
        "angle": 3,
        "cueSpeed": 0.6,
        "top": 0,
        "side": 0
      },
      "rotation": 90
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 16.17519724716382,
      "finalBlockedFraction": 1,
      "finalExposure": 0,
      "cueRailDistance": 0.5781566069824586,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.37316895823491314,
      "targetTravel": 0.37776014930097035,
      "targetPocketDistance": 1.1569652319074173,
      "pocketDistanceGain": 0.1412556187894629,
      "cueInBaulk": true,
      "redTotalTravel": 0.37776014930097035
    }
  },
  {
    "id": "hide-yellow",
    "title": "The yellow-ball window",
    "category": "Snooker · Yellow",
    "difficulty": "Foundation",
    "paperClass": "open → screened",
    "targetId": "red1",
    "objective": {
      "type": "snooker",
      "cueZone": {
        "x": 0.59,
        "y": 1.2,
        "radius": 0.12
      }
    },
    "acceptance": {
      "minBlockedFraction": 0.95
    },
    "task": "Use a thin contact to bring the cue ball to the left of the yellow, which sits on its official D-area spot.",
    "goal": "Hit the red first and finish behind the yellow with at least 95% of contact directions blocked.",
    "explanation": "Contact thickness and the last few centimetres matter more than a long route here. Do not draw the cue ball onto the yellow: the centres must remain at least one ball diameter apart.",
    "source": "Paper pp. 14–16, inflated 2R collision geometry; approved occlusion-angle extension; Dr. Dave: thin-hit hiding shots.",
    "hint": "Clip the red first, then bring the last segment into the window to the left of the yellow.",
    "level": 2,
    "tactic": "hide",
    "brief": "Clip the red, then tuck in beside the yellow.",
    "learn": "Final centimetres decide whether the red can be seen.",
    "focus": {
      "id": "yellow",
      "label": "Hide behind",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 0.8478020952215726,
        "y": 0.45784070254806375
      },
      {
        "id": "red1",
        "color": "red",
        "x": 0.8478020952215726,
        "y": 0.9078407025480637
      },
      {
        "id": "yellow",
        "color": "yellow",
        "x": 0.737,
        "y": 1.181
      }
    ],
    "referenceShot": {
      "angle": 94,
      "cueSpeed": 0.6,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "verified-track-clear-colour-on-official-spot",
      "baseShot": {
        "angle": 4,
        "cueSpeed": 0.6,
        "top": 0,
        "side": 0
      },
      "rotation": 90
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 14.194592488905196,
      "finalBlockedFraction": 1,
      "finalExposure": 0,
      "cueRailDistance": 0.5605329451973116,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.42491318956661456,
      "targetTravel": 0.30242343010293044,
      "targetPocketDistance": 0.9884305958987843,
      "pocketDistanceGain": -0.22645441742722416,
      "cueInBaulk": true,
      "redTotalTravel": 0.30242343010293044
    }
  },
  {
    "id": "hide-green",
    "title": "The green hideaway",
    "category": "Snooker · Green",
    "difficulty": "Foundation",
    "paperClass": "open → screened",
    "targetId": "red1",
    "objective": {
      "type": "snooker",
      "cueZone": {
        "x": 0.836,
        "y": 0.485,
        "radius": 0.12
      }
    },
    "acceptance": {
      "minBlockedFraction": 0.95
    },
    "task": "Clip the red and stop on the far side of the green, which sits on its official spot.",
    "goal": "Hit the red first and leave the green between the cue ball and the red, blocking at least 95% of contact directions.",
    "explanation": "From the new angle the green must sit on the straight line between the two balls. A few centimetres either side lets the red peek out again, so judge the last metre of the route carefully.",
    "source": "Paper pp. 14–16, Eq. (37), exposure proxy; approved occlusion-angle extension; Dr. Dave: entering a safety zone along the blocking line.",
    "hint": "Finish just up and to the right of the green so it lines up with the red.",
    "level": 2,
    "tactic": "hide",
    "brief": "Clip the red and stop in line behind the green.",
    "learn": "Line up a blocker between the white and the red.",
    "focus": {
      "id": "green",
      "label": "Hide behind",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1.3932772212298958,
        "y": 0.8201738764542805
      },
      {
        "id": "red1",
        "color": "red",
        "x": 0.9586105993998152,
        "y": 0.7037053061581464
      },
      {
        "id": "green",
        "color": "green",
        "x": 0.737,
        "y": 0.597
      }
    ],
    "referenceShot": {
      "angle": 198,
      "cueSpeed": 0.6,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "verified-track-clear-colour-on-official-spot",
      "baseShot": {
        "angle": 3,
        "cueSpeed": 0.6,
        "top": 0,
        "side": 0
      },
      "rotation": 195
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 16.175197247164014,
      "finalBlockedFraction": 1,
      "finalExposure": 0,
      "cueRailDistance": 0.46082702737902914,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.3731689582349087,
      "targetTravel": 0.3777601493009629,
      "targetPocketDistance": 0.9595970597044216,
      "pocketDistanceGain": -0.12543494901184815,
      "cueInBaulk": false,
      "redTotalTravel": 0.3777601493009629
    }
  },
  {
    "id": "one-rail-blue",
    "title": "Around the blue",
    "category": "1 cushion · Escape",
    "difficulty": "Foundation",
    "paperClass": "screened",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 2.7,
        "y": 0.35,
        "radius": 0.7
      }
    },
    "acceptance": {
      "preContactCushions": 1,
      "initialBlockedFraction": 0.99
    },
    "task": "The blue blocks the direct path. Use the top cushion to reach the red, then control the cue-ball finish.",
    "goal": "Take exactly one cushion before first contact with the red. Avoid the blue and the pockets.",
    "explanation": "Mirror the target beyond the cushion to find an initial direction, then account for friction and rebound losses. The paper compares first-contact distances: reaching the red is useful only if the blue is not hit first.",
    "source": "Paper pp. 14–16, Eqs. (34)–(37), screened benchmark; Dr. Dave: Mirror Kick and Bank Shot Aiming System.",
    "hint": "Look for a return path off the top cushion. Choose the first contact point before planning the leave.",
    "level": 2,
    "tactic": "escape",
    "brief": "Use the top cushion to reach the red past the blue.",
    "learn": "Mirror the red to find a one-cushion route.",
    "focus": {
      "id": "blue",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1,
        "y": 0.7
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.6496405921989967,
        "y": 0.40140356960859414
      },
      {
        "id": "blue",
        "color": "blue",
        "x": 1.7423382664895486,
        "y": 0.5656316063238673
      }
    ],
    "referenceShot": {
      "angle": -35,
      "cueSpeed": 1.3,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "forward-path-then-recheck-all-balls",
      "seed": {
        "x": 1,
        "y": 0.7,
        "angle": -35,
        "speed": 1.3
      },
      "fraction": 0.35,
      "blockerFraction": 0.45
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "1 cushion"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "top"
      ],
      "allCueCushions": [
        "top"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.33002439576741704,
      "cueRailDistance": 0.4494950259935814,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.831441525514586,
      "targetTravel": 0.9918391649833078,
      "targetPocketDistance": 0.8833737426105078,
      "pocketDistanceGain": -0.07035214566397552,
      "cueInBaulk": false,
      "redTotalTravel": 0.9918391649833078
    }
  },
  {
    "id": "hide-blue",
    "title": "Hide behind the blue",
    "category": "Snooker · Blue",
    "difficulty": "Intermediate",
    "paperClass": "open → screened",
    "targetId": "red1",
    "objective": {
      "type": "snooker",
      "cueZone": {
        "x": 1.72,
        "y": 1.03,
        "radius": 0.12
      }
    },
    "acceptance": {
      "minBlockedFraction": 0.95
    },
    "task": "Clip the red and stop below the blue on its official spot.",
    "goal": "Hit the red first. Leave the blue between the cue ball and red, blocking at least 95% of contact directions.",
    "explanation": "Depth matters. A blue beyond the red does not block the route, even when the directions look similar. A different route deserves credit when it creates equivalent obstruction.",
    "source": "Paper pp. 14–16, Eq. (34), nearest contact; Eq. (37), exposure; approved occlusion-angle extension.",
    "hint": "Focus on the area below the blue. Imagine the line from the resting cue ball towards the red.",
    "level": 3,
    "tactic": "hide",
    "brief": "Clip the red and stop below the blue.",
    "learn": "A blocker only counts if it is in front of the red.",
    "focus": {
      "id": "blue",
      "label": "Hide behind",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 0.854101652859057,
        "y": 0.6709437816437903
      },
      {
        "id": "red1",
        "color": "red",
        "x": 1.304101652859057,
        "y": 0.6709437816437903
      },
      {
        "id": "blue",
        "color": "blue",
        "x": 1.7845,
        "y": 0.889
      }
    ],
    "referenceShot": {
      "angle": 3,
      "cueSpeed": 0.8,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "verified-track-clear-colour-on-official-spot",
      "baseShot": {
        "angle": 3,
        "cueSpeed": 0.8,
        "top": 0,
        "side": 0
      },
      "rotation": 0
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 8.082646104625834,
      "finalBlockedFraction": 1,
      "finalExposure": 0,
      "cueRailDistance": 0.7268813596946755,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.7449352702811594,
      "targetTravel": 0.7996686277071436,
      "targetPocketDistance": 0.43142546790855263,
      "pocketDistanceGain": -0.3937703452547354,
      "cueInBaulk": false,
      "redTotalTravel": 0.7996686277071436
    }
  },
  {
    "id": "hide-pink",
    "title": "Slip in beside the pink",
    "category": "Snooker · Pink",
    "difficulty": "Intermediate",
    "paperClass": "open → screened",
    "targetId": "red1",
    "objective": {
      "type": "snooker",
      "cueZone": {
        "x": 2.527,
        "y": 0.892,
        "radius": 0.12
      }
    },
    "acceptance": {
      "minBlockedFraction": 0.95
    },
    "task": "The pink is on its spot in the middle of the table. Clip the red and stop on the left of the pink with the red on the other side.",
    "goal": "Hit the red first and stop on the left of the pink so it blocks at least 95% of contact directions.",
    "explanation": "A blocker works from any side. Here the cue ball and red end up on opposite sides of the pink, so the pink fills the gap between them. Very low speed keeps both balls close to the blocker.",
    "source": "Paper pp. 14–16, Eq. (37), exposure proxy; approved occlusion-angle extension.",
    "hint": "Clip the red thinly, then settle on the left of the pink with the red on its right.",
    "level": 3,
    "tactic": "hide",
    "brief": "Clip the red and stop on the far side of the pink.",
    "learn": "A blocker works from any side.",
    "focus": {
      "id": "pink",
      "label": "Hide behind",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 2.364763103639452,
        "y": 0.3162245410371085
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.589763103639452,
        "y": 0.7059359727401058
      },
      {
        "id": "pink",
        "color": "pink",
        "x": 2.67675,
        "y": 0.889
      }
    ],
    "referenceShot": {
      "angle": 63,
      "cueSpeed": 0.5,
      "top": 0.1,
      "side": 0
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 21.416195328089575,
      "finalBlockedFraction": 0.9673012903179308,
      "finalExposure": 0,
      "cueRailDistance": 0.8365052671984949,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.27342408769620474,
      "targetTravel": 0.26408842289020656,
      "targetPocketDistance": 1.1538581237086802,
      "pocketDistanceGain": 0.08297331959034615,
      "cueInBaulk": false,
      "redTotalTravel": 0.26408842289020656
    }
  },
  {
    "id": "one-rail-short",
    "title": "Take the short cushion",
    "category": "1 cushion · Change of angle",
    "difficulty": "Intermediate",
    "paperClass": "screened",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 2.2,
        "y": 0.07,
        "radius": 0.22
      }
    },
    "acceptance": {
      "preContactCushions": 1,
      "initialBlockedFraction": 0.99,
      "minSeparation": 0.8,
      "maxCueRailDistance": 0.04,
      "minTargetPocketDistance": 0.45
    },
    "task": "The pink blocks the direct route. Rebound from the right cushion, hit the red and leave the cue ball near the top cushion.",
    "goal": "Use one cushion before the red, finish within 4 cm of the long cushion and separate the balls by at least 80 cm.",
    "explanation": "Changing to a short cushion changes both the approach angle and the speed lost. Contact is only the first step: keep the cue ball near the long cushion while separating the balls. The mirror line is a starting guide.",
    "source": "Paper pp. 14–16, Eqs. (34)–(37), screened and near-cushion benchmarks; Dr. Dave: mirror aiming and speed corrections.",
    "hint": "Use the right cushion for a return path instead of trying to pass through the pink.",
    "level": 3,
    "tactic": "escape",
    "brief": "Rebound off the right cushion, then leave the white on the top cushion.",
    "learn": "Pick a cushion that sets up your next position.",
    "focus": {
      "id": "pink",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 2.7,
        "y": 1.2
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.9929753789077402,
        "y": 0.36823652324564865
      },
      {
        "id": "pink",
        "color": "pink",
        "x": 2.831838920508483,
        "y": 0.8257064354605419
      }
    ],
    "referenceShot": {
      "angle": -21.861425385519386,
      "cueSpeed": 1.3820121825883784,
      "top": -0.14982510362712337,
      "side": -0.22850518065951686
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "spin",
      "1 cushion"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "right"
      ],
      "allCueCushions": [
        "right"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.32773997651314285,
      "cueRailDistance": 0.023832236557601052,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.8366510546453547,
      "targetTravel": 0.0516717970533153,
      "targetPocketDistance": 0.6435104594649934,
      "pocketDistanceGain": -0.04015795516049192,
      "cueInBaulk": false,
      "redTotalTravel": 0.0516717970533153
    }
  },
  {
    "id": "one-rail-left",
    "title": "Off the left cushion",
    "category": "1 cushion · Escape",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 1.018,
        "y": 0.519,
        "radius": 0.35
      }
    },
    "acceptance": {
      "preContactCushions": 1,
      "initialBlockedFraction": 0.99
    },
    "paperClass": "screened",
    "difficulty": "Intermediate",
    "task": "The brown stands in the direct line. Bounce off the left cushion to reach the red.",
    "goal": "Take exactly one cushion before first contact with the red. Avoid the brown and the pockets.",
    "explanation": "Aim at the mirror image of the red on the other side of the cushion. A gentle shot loses little speed on the way in, so the first guess is usually close.",
    "source": "Paper pp. 14–16, Eqs. (34)–(37), screened benchmark; Dr. Dave: Mirror Kick and Bank Shot Aiming System.",
    "hint": "Head for the left cushion first, then look for the red on the rebound.",
    "level": 3,
    "tactic": "escape",
    "brief": "Bounce off the left cushion to reach the red past the brown.",
    "learn": "Aim at the red's mirror image.",
    "focus": {
      "id": "brown",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1.1,
        "y": 0.7
      },
      {
        "id": "red1",
        "color": "red",
        "x": 1.0056968947514209,
        "y": 0.5205863552217288
      },
      {
        "id": "brown",
        "color": "brown",
        "x": 1.0575636026381394,
        "y": 0.6192638598497779
      }
    ],
    "referenceShot": {
      "angle": -175,
      "cueSpeed": 1.2,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "forward-path-then-recheck-all-balls",
      "seed": {
        "x": 1.1,
        "y": 0.7,
        "angle": -175,
        "speed": 1.2
      },
      "fraction": 0.35,
      "blockerFraction": 0.45
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "1 cushion"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "left"
      ],
      "allCueCushions": [
        "left"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.6544280848847067,
      "cueRailDistance": 0.49320408100917634,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.3179951832109878,
      "targetTravel": 0.3305906654413735,
      "targetPocketDistance": 0.6656179479615302,
      "pocketDistanceGain": -0.27115546647115607,
      "cueInBaulk": false,
      "redTotalTravel": 0.3305906654413735
    }
  },
  {
    "id": "one-rail-right",
    "title": "Spin off the right cushion",
    "category": "1 cushion · Escape with spin",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 1.633,
        "y": 0.411,
        "radius": 0.35
      }
    },
    "acceptance": {
      "preContactCushions": 1,
      "initialBlockedFraction": 0.99
    },
    "paperClass": "screened",
    "difficulty": "Advanced",
    "task": "The yellow blocks the direct route. Use the right cushion, with a touch of side spin, to reach the red.",
    "goal": "Take exactly one cushion before first contact with the red and avoid the yellow.",
    "explanation": "Side spin changes how the ball leaves the cushion. A small amount of spin kicks the cue ball a little longer or shorter. Several shot settings can find the same red, so a route without spin may work too.",
    "source": "Paper pp. 14–16, Eqs. (34)–(37); side-spin cushion coupling is a teaching extension.",
    "hint": "Head for the right cushion first. Side spin carries the ball along the cushion after the rebound.",
    "level": 4,
    "tactic": "escape",
    "brief": "Use the right cushion and a little side spin to get round the yellow.",
    "learn": "Side spin changes the angle off a cushion.",
    "focus": {
      "id": "yellow",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1.5,
        "y": 0.4
      },
      {
        "id": "red1",
        "color": "red",
        "x": 1.757088740336786,
        "y": 0.21001212732534114
      },
      {
        "id": "yellow",
        "color": "yellow",
        "x": 1.6542532442020716,
        "y": 0.2860072763952047
      }
    ],
    "referenceShot": {
      "angle": -9,
      "cueSpeed": 1.55,
      "top": 0.1,
      "side": 0.25
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "spin",
      "1 cushion"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "right"
      ],
      "allCueCushions": [
        "right"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.6947094796122485,
      "cueRailDistance": 0.38506693458739755,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.27319615181726464,
      "targetTravel": 0.07390828300025587,
      "targetPocketDistance": 0.16630795797024986,
      "pocketDistanceGain": -0.04548550458239703,
      "cueInBaulk": false,
      "redTotalTravel": 0.07390828300025587
    }
  },
  {
    "id": "two-rail-corridor",
    "title": "Through the two-cushion corridor",
    "category": "2 cushions · Escape",
    "difficulty": "Advanced",
    "paperClass": "congested",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 3.05,
        "y": 1.05,
        "radius": 0.7
      }
    },
    "acceptance": {
      "preContactCushions": 2,
      "initialBlockedFraction": 0.99
    },
    "task": "The green blocks direct access. Use the top cushion and then the right cushion to reach the red.",
    "goal": "Take two cushions before first contact with the red. Avoid the green and leave the cue ball in the right-hand recovery area.",
    "explanation": "Each cushion changes speed and spin, so the second rebound is not simply a copy of the first. Establish the first contact point, then refine the approach to the red after the second cushion.",
    "source": "Paper pp. 2–4 and 14–16, executable shots and first contact; two cushions are a teaching extension; Dr. Dave: Plus System.",
    "hint": "Start towards the top long cushion and use the right short cushion to approach the red.",
    "level": 4,
    "tactic": "escape",
    "brief": "Top cushion, then right cushion: get round the green.",
    "learn": "Plan the second rebound before the first.",
    "focus": {
      "id": "green",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1.1,
        "y": 0.9
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.854652657471851,
        "y": 0.8258946125183393
      },
      {
        "id": "green",
        "color": "green",
        "x": 1.889593695862333,
        "y": 0.8666525756332527
      }
    ],
    "referenceShot": {
      "angle": -30,
      "cueSpeed": 2,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "forward-path-then-recheck-all-balls",
      "seed": {
        "x": 1.1,
        "y": 0.9,
        "angle": -30,
        "speed": 2
      },
      "fraction": 0.2,
      "blockerFraction": 0.45
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "2 cushions"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "top",
        "right"
      ],
      "allCueCushions": [
        "top",
        "right"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.26975108079883464,
      "cueRailDistance": 0.8354004821105411,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.9826917511375459,
      "targetTravel": 1.1582609760662368,
      "targetPocketDistance": 0.36370033201486573,
      "pocketDistanceGain": -0.7282676330664577,
      "cueInBaulk": false,
      "redTotalTravel": 1.1582609760662368
    }
  },
  {
    "id": "two-rail-return",
    "title": "Two cushions back to safety",
    "category": "2 cushions · Escape and recover",
    "difficulty": "Advanced",
    "paperClass": "congested",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 0.55,
        "y": 0.75,
        "radius": 0.7
      }
    },
    "acceptance": {
      "preContactCushions": 2,
      "initialBlockedFraction": 0.99
    },
    "task": "Go around the brown using the bottom and left cushions, hit the red and keep the cue ball on the left.",
    "goal": "Take two cushions before the red, then finish in the left-hand area without potting a ball.",
    "explanation": "Escaping is only the start. The paper separates reliable contact from a safe return. Continue your drawing beyond contact to the actual resting position and check the leave of both balls.",
    "source": "Paper pp. 5–6 and 20–22; multiple cushions are a teaching extension; Cuestars: checking both cue-ball and red-ball finishes.",
    "hint": "Use the bottom long cushion first, then rebound from the left short cushion.",
    "level": 4,
    "tactic": "escape",
    "brief": "Bottom cushion, then left cushion: get round the brown.",
    "learn": "Escape first, then recover to a safe leave.",
    "focus": {
      "id": "brown",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 2.4,
        "y": 0.8
      },
      {
        "id": "red1",
        "color": "red",
        "x": 0.7435640810755726,
        "y": 0.668487496372695
      },
      {
        "id": "brown",
        "color": "brown",
        "x": 1.6546038364840077,
        "y": 0.7408193733677128
      }
    ],
    "referenceShot": {
      "angle": 145,
      "cueSpeed": 2,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "forward-path-then-recheck-all-balls",
      "seed": {
        "x": 2.4,
        "y": 0.8,
        "angle": 145,
        "speed": 2
      },
      "fraction": 0.35,
      "blockerFraction": 0.45
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "2 cushions"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "bottom",
        "left"
      ],
      "allCueCushions": [
        "bottom",
        "left"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.31920258107481014,
      "cueRailDistance": 0.5551825103868208,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.8564469955239067,
      "targetTravel": 1.001062878264489,
      "targetPocketDistance": 0.2503919097300638,
      "pocketDistanceGain": -0.7494896209886484,
      "cueInBaulk": false,
      "redTotalTravel": 1.001062878264489
    }
  },
  {
    "id": "two-rail-bottom",
    "title": "Bottom then right",
    "category": "2 cushions · Escape",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 1.801,
        "y": 0.573,
        "radius": 0.45
      }
    },
    "acceptance": {
      "preContactCushions": 2,
      "initialBlockedFraction": 0.99
    },
    "paperClass": "screened",
    "difficulty": "Advanced",
    "task": "The green blocks direct access. Use the bottom cushion and then the right cushion to reach the red.",
    "goal": "Take two cushions before first contact with the red and avoid the green.",
    "explanation": "Plan the second rebound first: where must the ball leave the right cushion? Work backwards to the first contact point, then check the speed that survives two cushions.",
    "source": "Paper pp. 2–4 and 14–16, executable shots and first contact; two cushions are a teaching extension; Dr. Dave: Plus System.",
    "hint": "Start towards the bottom cushion and keep the pace gentle for the second rebound.",
    "level": 4,
    "tactic": "escape",
    "brief": "Bottom cushion, then right cushion: get round the green.",
    "learn": "Speed drops with every cushion, so plan the pace.",
    "focus": {
      "id": "green",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 0.7,
        "y": 1
      },
      {
        "id": "red1",
        "color": "red",
        "x": 1.8697411656493383,
        "y": 0.603754926385994
      },
      {
        "id": "green",
        "color": "green",
        "x": 1.2263835245422023,
        "y": 0.8216897168736973
      }
    ],
    "referenceShot": {
      "angle": 25,
      "cueSpeed": 2,
      "top": 0,
      "side": 0
    },
    "construction": {
      "method": "forward-path-then-recheck-all-balls",
      "seed": {
        "x": 0.7,
        "y": 1,
        "angle": 25,
        "speed": 2
      },
      "fraction": 0.35,
      "blockerFraction": 0.45
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "2 cushions"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "bottom",
        "right"
      ],
      "allCueCushions": [
        "bottom",
        "right"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.4660180327662725,
      "cueRailDistance": 0.5465400669428873,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.5726482115113997,
      "targetTravel": 0.6476808404256276,
      "targetPocketDistance": 0.6065857452105294,
      "pocketDistanceGain": -0.0031568787355212846,
      "cueInBaulk": false,
      "redTotalTravel": 0.6476808404256276
    }
  },
  {
    "id": "hide-black",
    "title": "Behind the black",
    "category": "Snooker · Black",
    "difficulty": "Advanced",
    "paperClass": "open → screened",
    "targetId": "red1",
    "objective": {
      "type": "snooker",
      "cueZone": {
        "x": 3.395,
        "y": 0.882,
        "radius": 0.1
      }
    },
    "acceptance": {
      "minBlockedFraction": 0.95
    },
    "task": "The black is near the end cushion. Slip the cue ball into the gap between the black and the cushion while the red finishes on the other side.",
    "goal": "Hit the red first and tuck in behind the black with at least 95% of contact directions blocked.",
    "explanation": "The space between the black and the cushion is only about 10 cm wide, so speed control is everything. A shot that is slightly too firm hits the cushion and rolls out of the window.",
    "source": "Paper pp. 14–16, Eq. (37), exposure proxy; approved occlusion-angle extension; Dr. Dave: thin-hit hiding shots.",
    "hint": "Use very little pace and aim for the narrow gap just behind the black.",
    "level": 4,
    "tactic": "hide",
    "brief": "Clip the red and slip in behind the black.",
    "learn": "Use almost no pace in a narrow gap.",
    "focus": {
      "id": "black",
      "label": "Hide behind",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 3.179420543280296,
        "y": 1.5527316697370939
      },
      {
        "id": "red1",
        "color": "red",
        "x": 3.179420543280296,
        "y": 1.102731669737094
      },
      {
        "id": "black",
        "color": "black",
        "x": 3.245,
        "y": 0.889
      }
    ],
    "referenceShot": {
      "angle": 274.5,
      "cueSpeed": 0.5,
      "top": 0.1,
      "side": 0
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 17.703920535808724,
      "finalBlockedFraction": 1,
      "finalExposure": 0,
      "cueRailDistance": 0.145071679542073,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.3411705613966128,
      "targetTravel": 0.1790456995210252,
      "targetPocketDistance": 0.9572941024891346,
      "pocketDistanceGain": 0.17770480615800055,
      "cueInBaulk": false,
      "redTotalTravel": 0.1790456995210252
    }
  },
  {
    "id": "send-red-safe",
    "title": "Move the danger away",
    "category": "Object ball · Safe zone",
    "difficulty": "Advanced",
    "paperClass": "near-cushion",
    "targetId": "red1",
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 3.34,
        "y": 0.08
      },
      {
        "id": "red1",
        "color": "red",
        "x": 3.26,
        "y": 0.28
      }
    ],
    "referenceShot": {
      "angle": 111.80140948635182,
      "cueSpeed": 0.9,
      "top": 0,
      "side": 0
    },
    "objective": {
      "type": "target",
      "cueZone": {
        "x": 3.18,
        "y": 0.48,
        "radius": 0.16
      },
      "targetZone": {
        "x": 2.63,
        "y": 1.71,
        "radius": 0.16
      }
    },
    "acceptance": {
      "minTargetPocketDistance": 0.65,
      "minPocketDistanceGain": 0.3,
      "minSeparation": 1
    },
    "task": "Send the red near the top-right corner towards a safe area by the bottom cushion, keeping the cue ball in the upper-right half.",
    "goal": "Leave the red at least 65 cm from every pocket, inside the lower safe zone, and more than 1 m from the cue ball.",
    "explanation": "Hiding the cue ball is not enough if the red stays near a pocket. Check the red’s safe zone first, then the cue ball. A cushion is not universally safe; the zone depends on this layout and its pockets.",
    "source": "Paper pp. 5–6 and 20–22, residual opportunity; Cuestars Safety: Cross Double and Re-Spotted Black safe-zone practice.",
    "hint": "Move the red away from the top-right corner towards the middle of the bottom cushion. The cue ball need not follow far.",
    "level": 4,
    "tactic": "object",
    "brief": "Send the red out of the corner and into the safe zone.",
    "learn": "A cushion is not automatically safe.",
    "focus": {
      "id": "red1",
      "label": "Move this",
      "role": "target"
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.15039103866779913,
      "cueRailDistance": 0.34079824287310023,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 1.4208873394255186,
      "targetTravel": 1.5771849952394796,
      "targetPocketDistance": 0.8834388222710677,
      "pocketDistanceGain": 0.46644841470753623,
      "cueInBaulk": false,
      "redTotalTravel": 1.5771849952394796
    }
  },
  {
    "id": "screw-back",
    "title": "Screw back to baulk",
    "category": "Control · Backspin",
    "difficulty": "Challenge",
    "paperClass": "open",
    "targetId": "red1",
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1.3,
        "y": 0.889
      },
      {
        "id": "red1",
        "color": "red",
        "x": 1.95,
        "y": 0.889
      }
    ],
    "referenceShot": {
      "angle": -0.16022789638831458,
      "cueSpeed": 3.511704886031311,
      "top": -0.3480079469872833,
      "side": -0.18225751066303894
    },
    "objective": {
      "type": "distance",
      "cueZone": {
        "x": 0.452,
        "y": 0.876,
        "radius": 0.3
      }
    },
    "acceptance": {
      "cueCushions": 0,
      "minSeparation": 1
    },
    "task": "Hit the red full ball and use backspin to bring the white all the way back into baulk.",
    "goal": "Hit the red first, pot nothing, and leave the cue ball more than 1 m from the red without touching a cushion.",
    "explanation": "Low tip position makes the white spin backwards. After the straight hit it rolls back along the line it came on. More pace means more screw. The red runs on to the end cushion and returns.",
    "source": "Paper pp. 20–22, execution variables and cue-ball control; Dr. Dave: draw shot fundamentals.",
    "hint": "Aim straight at the red, strike low on the ball and hit firmly.",
    "level": 5,
    "tactic": "control",
    "brief": "Hit the red straight and screw the white back to baulk.",
    "learn": "Backspin brings the white back along its line.",
    "focus": {
      "id": "red1",
      "label": "Hit first",
      "role": "target"
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "spin"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.2596541759397462,
      "cueRailDistance": 0.44990461086381334,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 1.0113034693982161,
      "targetTravel": 0.5897788411195112,
      "targetPocketDistance": 0.7842457946680335,
      "pocketDistanceGain": -0.12002808530417941,
      "cueInBaulk": true,
      "redTotalTravel": 0.5897788411195112
    }
  },
  {
    "id": "return-to-baulk",
    "title": "Kick, clip and run home",
    "category": "Control · Cushion first",
    "difficulty": "Challenge",
    "paperClass": "near-cushion",
    "targetId": "red1",
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1.2,
        "y": 1.3
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.5,
        "y": 0.45
      }
    ],
    "referenceShot": {
      "angle": -13.958620753294486,
      "cueSpeed": 2.314327536948578,
      "top": -0.1447126629462573,
      "side": -0.07114248911340754
    },
    "objective": {
      "type": "distance",
      "cueZone": {
        "x": 0.364,
        "y": 0.371,
        "radius": 0.35
      }
    },
    "acceptance": {
      "preContactCushions": 1,
      "cueBaulk": true,
      "maxTargetTravel": 0.2,
      "minSeparation": 1.5
    },
    "task": "Play off the right cushion to reach the red, barely touch it, then let the white run back into baulk.",
    "goal": "Hit the red first after one cushion, move it less than 20 cm, and finish in baulk more than 1.5 m from the red.",
    "explanation": "Arriving from the cushion gives a very thin contact on the red, so almost all the pace stays in the white. It then runs across the top and back down the table. Small changes to the contact point change the whole route, so adjust the first angle by tiny amounts.",
    "source": "Paper pp. 4, 15 Eq. (35) and 20–22, thin contact and separation; Cuestars Safety: Clipping the Reds.",
    "hint": "Aim well to the right of the red, off the right cushion, so the white returns to clip its edge.",
    "level": 5,
    "tactic": "control",
    "brief": "Kick off the right cushion, clip the red, and send the white home.",
    "learn": "A thin contact keeps the pace for a long route.",
    "focus": {
      "id": "red1",
      "label": "Clip this",
      "role": "target"
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "1 cushion"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "right"
      ],
      "allCueCushions": [
        "right",
        "top"
      ],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.07525415982238105,
      "cueRailDistance": 0.46057814966548205,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 1.940163072637046,
      "targetTravel": 0.12922131224016076,
      "targetPocketDistance": 0.849874458737642,
      "pocketDistanceGain": 0.004628784392011309,
      "cueInBaulk": true,
      "redTotalTravel": 0.12922131224016076
    }
  },
  {
    "id": "two-rail-spin",
    "title": "Right then bottom, with pace",
    "category": "2 cushions · Escape with spin",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 0.189,
        "y": 1.651,
        "radius": 0.5
      }
    },
    "acceptance": {
      "preContactCushions": 2,
      "initialBlockedFraction": 0.99
    },
    "paperClass": "screened",
    "difficulty": "Challenge",
    "task": "The blue guards the middle of the table. Go off the right cushion and then the bottom cushion to reach the red.",
    "goal": "Take two cushions before first contact with the red and avoid the blue.",
    "explanation": "A firm shot with side spin bends the second rebound. The reference uses more pace than most safeties, so treat the route as a guide and adjust the first contact point rather than copying the line.",
    "source": "Paper pp. 2–4 and 14–16, executable shots and first contact; side-spin cushion coupling is a teaching extension.",
    "hint": "Hit the right cushion first, then let the ball run along the bottom cushion.",
    "level": 5,
    "tactic": "escape",
    "brief": "Right cushion, then bottom cushion, with side spin.",
    "learn": "Firm pace and spin make rebounds touchier.",
    "focus": {
      "id": "blue",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 2,
        "y": 1.3
      },
      {
        "id": "red1",
        "color": "red",
        "x": 0.5125521499374343,
        "y": 1.6971645172126837
      },
      {
        "id": "blue",
        "color": "blue",
        "x": 1.3306484674718453,
        "y": 1.4787240327457076
      }
    ],
    "referenceShot": {
      "angle": -5,
      "cueSpeed": 2.6,
      "top": 0,
      "side": 0.25
    },
    "construction": {
      "method": "forward-path-then-recheck-all-balls",
      "seed": {
        "x": 2,
        "y": 1.3,
        "angle": -5,
        "speed": 2.6,
        "side": 0.25
      },
      "fraction": 0.35,
      "blockerFraction": 0.45
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "spin",
      "2 cushions"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "right",
        "bottom"
      ],
      "allCueCushions": [
        "right",
        "bottom"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.6023456988751957,
      "cueRailDistance": 0.10086761718154302,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.380192810901646,
      "targetTravel": 0.1525406368406442,
      "targetPocketDistance": 0.6006029295788248,
      "pocketDistanceGain": 0.08171557987472511,
      "cueInBaulk": true,
      "redTotalTravel": 0.1525406368406442
    }
  },
  {
    "id": "three-rail-escape",
    "title": "The three-cushion escape",
    "category": "3 cushions · Escape",
    "difficulty": "Challenge",
    "paperClass": "congested",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 1.3,
        "y": 0.2,
        "radius": 0.3
      }
    },
    "acceptance": {
      "preContactCushions": 3,
      "initialBlockedFraction": 0.99,
      "minSeparation": 1.5,
      "maxCueRailDistance": 0.2,
      "minTargetPocketDistance": 0.6
    },
    "task": "Use the top, right and bottom cushions to get around the pink. Clip the red after the third cushion and bring the cue ball back towards the top.",
    "goal": "Take exactly three cushions before the red, separate the balls by at least 1.5 m and finish in the top recovery area.",
    "explanation": "A small error at the first cushion grows over a long route. Adjust one rebound at a time, then refine contact thickness to keep enough separation. This route needs more cue speed than a routine gentle safety. The reference is generated by the engine.",
    "source": "Paper pp. 2–4 and 20–22; three cushions extend the paper’s planar 0/1-cushion benchmark; Dr. Dave: Corner-5.",
    "hint": "Start towards the top cushion, then plan consecutive rebounds from the right and bottom cushions.",
    "level": 5,
    "tactic": "escape",
    "brief": "Three cushions to get round the pink.",
    "learn": "Small errors grow with every rebound.",
    "focus": {
      "id": "pink",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 1,
        "y": 0.8
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.4805805353850525,
        "y": 1.466730374228537
      },
      {
        "id": "pink",
        "color": "pink",
        "x": 1.6662612409232738,
        "y": 1.1000286684028415
      }
    ],
    "referenceShot": {
      "angle": -29.214001079428844,
      "cueSpeed": 4.130317527247467,
      "top": -0.3138847946539541,
      "side": -0.16951927204309522
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "spin",
      "3 cushions"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "top",
        "right",
        "bottom"
      ],
      "allCueCushions": [
        "top",
        "right",
        "bottom",
        "top"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.1057433712649871,
      "cueRailDistance": 0.0510387512348983,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 1.6850551095703679,
      "targetTravel": 0.08253286689689812,
      "targetPocketDistance": 0.6803581047430455,
      "pocketDistanceGain": -0.08214887336918664,
      "cueInBaulk": false,
      "redTotalTravel": 0.08253286689689812
    }
  },
  {
    "id": "three-rail-sweep",
    "title": "The three-cushion sweep",
    "category": "3 cushions · Escape",
    "targetId": "red1",
    "objective": {
      "type": "escape",
      "cueZone": {
        "x": 3.278,
        "y": 1.437,
        "radius": 0.5
      }
    },
    "acceptance": {
      "preContactCushions": 3,
      "initialBlockedFraction": 0.99
    },
    "paperClass": "screened",
    "difficulty": "Challenge",
    "task": "Go off the top, left and bottom cushions in turn to get round the brown and hit the red.",
    "goal": "Take exactly three cushions before first contact with the red. Avoid the brown and the pockets.",
    "explanation": "Three rebounds are very sensitive to the first angle. Change one contact point at a time and watch how the last segment moves. A tiny change at the top cushion becomes a big change at the red.",
    "source": "Paper pp. 2–4 and 20–22; three cushions extend the paper’s planar 0/1-cushion benchmark; Dr. Dave: Corner-5.",
    "hint": "Aim for the top cushion first, then follow the ball round the table.",
    "level": 5,
    "tactic": "escape",
    "brief": "Top, left and bottom cushions to get round the brown.",
    "learn": "Change one contact point at a time.",
    "focus": {
      "id": "brown",
      "label": "In the way",
      "role": "colour"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 0.7,
        "y": 0.4
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.876374980428057,
        "y": 1.4769411315610899
      },
      {
        "id": "brown",
        "color": "brown",
        "x": 1.6793687411926257,
        "y": 0.8846235092024903
      }
    ],
    "referenceShot": {
      "angle": -148.234862646562,
      "cueSpeed": 2.6252009652574335,
      "top": -0.2957662841128222,
      "side": 0.1087534331475109
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1"
    ],
    "tags": [
      "spin",
      "3 cushions"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red1",
      "legalFirstContact": true,
      "preContactCushions": [
        "top",
        "left",
        "bottom"
      ],
      "allCueCushions": [
        "top",
        "left",
        "bottom"
      ],
      "pockets": [],
      "initialBlockedFraction": 1,
      "initialScreened": true,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.5827099567325524,
      "cueRailDistance": 0.26478443998516576,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 0.4050492883071463,
      "targetTravel": 0.028839515345063085,
      "targetPocketDistance": 0.7700740658148972,
      "pocketDistanceGain": 0.014848364449569496,
      "cueInBaulk": false,
      "redTotalTravel": 0.028839515345063085
    }
  },
  {
    "id": "break-off",
    "title": "A controlled break-off",
    "category": "Break-off · Return to baulk",
    "difficulty": "Challenge",
    "paperClass": "congested",
    "targetId": "red15",
    "objective": {
      "type": "rail",
      "cueZone": {
        "x": 0.12,
        "y": 1.02,
        "radius": 0.18
      }
    },
    "acceptance": {
      "cueBaulk": true,
      "maxRedTotalTravel": 0.5,
      "fullRack": true,
      "maxCueRailDistance": 0.04
    },
    "task": "From the D, clip the outer red and return to baulk off the cushions. All 15 reds and six colours are on the table.",
    "goal": "Hit a red first, pot nothing, return the cue ball to baulk near the end cushion and keep the reds compact.",
    "explanation": "Aim for a repeatable return before chasing a tiny landing window. Watch both the compact red pack and the cue-ball return. Packed collisions are simplified; this reference is not a uniquely optimal real-table break-off.",
    "source": "Paper pp. 20–22 and numerical model limits; Cuestars Safety: Break Off; The Snooker Gym: Break Off Shot.",
    "hint": "Clip the outside red and leave a route back to baulk on the left.",
    "level": 5,
    "tactic": "break",
    "brief": "Clip the outside red and bring the white home to baulk.",
    "learn": "A repeatable return beats a tiny landing window.",
    "focus": {
      "id": "red15",
      "label": "Clip this",
      "role": "target"
    },
    "balls": [
      {
        "id": "cue",
        "color": "white",
        "x": 0.6900000000000001,
        "y": 1.13
      },
      {
        "id": "yellow",
        "color": "yellow",
        "x": 0.737,
        "y": 1.181
      },
      {
        "id": "green",
        "color": "green",
        "x": 0.737,
        "y": 0.597
      },
      {
        "id": "brown",
        "color": "brown",
        "x": 0.737,
        "y": 0.889
      },
      {
        "id": "blue",
        "color": "blue",
        "x": 1.7845,
        "y": 0.889
      },
      {
        "id": "pink",
        "color": "pink",
        "x": 2.67675,
        "y": 0.889
      },
      {
        "id": "black",
        "color": "black",
        "x": 3.245,
        "y": 0.889
      },
      {
        "id": "red1",
        "color": "red",
        "x": 2.733,
        "y": 0.889
      },
      {
        "id": "red2",
        "color": "red",
        "x": 2.7789,
        "y": 0.8625
      },
      {
        "id": "red3",
        "color": "red",
        "x": 2.7789,
        "y": 0.9155
      },
      {
        "id": "red4",
        "color": "red",
        "x": 2.8248,
        "y": 0.836
      },
      {
        "id": "red5",
        "color": "red",
        "x": 2.8248,
        "y": 0.889
      },
      {
        "id": "red6",
        "color": "red",
        "x": 2.8248,
        "y": 0.9420000000000001
      },
      {
        "id": "red7",
        "color": "red",
        "x": 2.8707000000000003,
        "y": 0.8095
      },
      {
        "id": "red8",
        "color": "red",
        "x": 2.8707000000000003,
        "y": 0.8625
      },
      {
        "id": "red9",
        "color": "red",
        "x": 2.8707000000000003,
        "y": 0.9155
      },
      {
        "id": "red10",
        "color": "red",
        "x": 2.8707000000000003,
        "y": 0.9685
      },
      {
        "id": "red11",
        "color": "red",
        "x": 2.9166000000000003,
        "y": 0.783
      },
      {
        "id": "red12",
        "color": "red",
        "x": 2.9166000000000003,
        "y": 0.836
      },
      {
        "id": "red13",
        "color": "red",
        "x": 2.9166000000000003,
        "y": 0.889
      },
      {
        "id": "red14",
        "color": "red",
        "x": 2.9166000000000003,
        "y": 0.9420000000000001
      },
      {
        "id": "red15",
        "color": "red",
        "x": 2.9166000000000003,
        "y": 0.995
      }
    ],
    "referenceShot": {
      "angle": -2.182591697061754,
      "cueSpeed": 1.9460105485032853,
      "top": 0.034477427343302294,
      "side": -0.18748106966093667
    },
    "construction": {
      "method": "bounded deterministic search; original zones and acceptance preserved; forward verified",
      "engine": "raised-nose cushions with rounded pocket jaws v3",
      "globalOptimality": false
    },
    "legalTargetIds": [
      "red1",
      "red2",
      "red3",
      "red4",
      "red5",
      "red6",
      "red7",
      "red8",
      "red9",
      "red10",
      "red11",
      "red12",
      "red13",
      "red14",
      "red15"
    ],
    "tags": [
      "spin"
    ],
    "proof": {
      "engine": "src/physics.js",
      "dt": 0.001,
      "completed": true,
      "firstContactId": "red15",
      "legalFirstContact": true,
      "preContactCushions": [],
      "allCueCushions": [
        "right",
        "left"
      ],
      "pockets": [],
      "initialBlockedFraction": 0,
      "initialScreened": false,
      "finalDeltaDegrees": 0,
      "finalBlockedFraction": 0,
      "finalExposure": 0.024035315835902626,
      "cueRailDistance": 0.0030390528060212744,
      "cueZoneReached": true,
      "targetZoneReached": true,
      "separation": 2.9218852500228616,
      "targetTravel": 0.03488386559171943,
      "targetPocketDistance": 1.001215089462195,
      "pocketDistanceGain": -0.01795847769896297,
      "cueInBaulk": true,
      "redTotalTravel": 0.3805998302713393
    }
  }
];
