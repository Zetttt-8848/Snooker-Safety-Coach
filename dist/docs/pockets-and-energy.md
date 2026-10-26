# Pocket geometry and table pace · 1.4.0

## Pocket defect and replacement

The old model combined four unbroken cushion walls with circular pocket capture regions. A corner approach could meet a wall before entering the circle. The middle circles, conversely, could capture a ball still passing across the cloth. Merely enlarging the corner circles would hide one error and worsen the other.

The replacement has six finite cushion segments and twelve rounded ends, shared by collision detection, rendering and the geometric aim guide. Each physical jaw has a 10 mm radius. Collision detection inflates that radius by the ball radius, so the entire ball must clear the rubber. Swept segment and circle tests choose the earliest contact, even between 1 ms samples. At a jaw, the impulse uses the local radial normal; it is never snapped onto a full-length rail.

The nominal mouth widths remain 89 mm at a corner and 102 mm at a middle pocket. For jaw radius j, the corner segment endpoint is a=(89 mm+2j)/sqrt(2)-j from the corner; this makes the gap between the two round rubber surfaces 89 mm. The middle endpoints lie 51 mm+j to either side of the pocket centre. A centre-on approach therefore has 49.5 mm of lateral clearance through a middle mouth after subtracting the 52.5 mm ball diameter. Oblique approaches meet a jaw sooner.

A pot is registered only after crossing a throat behind the opening: 10 mm beyond a middle cushion nose, or u+v=20 mm at a corner, where u and v are distances inward from the adjoining noses. Rubber wins a simultaneous jaw/throat contact. These jaw radii and throat depths are explicit modelling assumptions, not measurements of a WPBSA pocket template. The model includes jaw rebounds but omits vertical shelf bounce, pocket liners and three-dimensional rattles. It does not impose an arbitrary rule that a middle pocket must always be harder than a corner.

## Energy and pace

Equal masses with a smooth collision and normal approach speed u transfer v_object=(1+e_ball)u/2. With e_ball=.94, a full-ball hit gives .97u to the initially stationary object ball and leaves .03u of the incoming normal speed on the white. The pair loses m(1-e_ball^2)u^2/4 of kinetic energy. A thin hit transfers much less because u is only the component along the line of centres. The red can move faster than the white **after** contact; it cannot gain more energy than the incoming system supplied.

The existing raised-nose cushion model remains dissipative. Spin can exchange rotational and translational energy, so forcing every individual velocity component to decrease would be incorrect. Tests check the total energy, including rotation, and passive jaw impacts.

The default rolling resistance changes from .011 to .014. Pure rolling still follows d=v^2/(2 mu_roll g): at .50 m/s, the stopping distance is .910 m instead of 1.158 m, a 21.4% reduction. Sliding friction stays .20 and ball restitution stays .94. Free Table starts at 1.10 m/s cue speed rather than 1.50, with gentler power shortcuts. No extra damping is applied only to red balls.

## Sources and verification

- [Dr. Dave: physical property ranges](https://drdavepoolinfo.com/faq/physics/physical-properties/) lists rolling resistance .005–.015 and ball restitution .92–.98. The .014 choice is a firmer teaching baseline within that approximate range, not a calibration of a professional snooker table.
- [Dr. Dave: pocket effective size and centre](https://drdavepoolinfo.com/faq/pocket/size-and-center/) explains the dependence on approach angle and speed. It supports testing mouth geometry and jaws instead of using a circular suction zone; its pool dimensions are not substituted for this app's snooker dimensions.
- The [cushion derivation](cushion-model.md) documents the retained impulse model and its limits.

Regression checks cover all four corners at 30, 45 and 60 degrees, with .4, 1, 3 and 8 m/s ball speed; both middle-pocket jaws; near-mouth passes; shallow versus perpendicular entry; fast swept capture; energy loss and stopping distance. All 23 lesson references are re-simulated. Cushion-escape references must meet the stated cushion sequence without relying on pocket jaws.
