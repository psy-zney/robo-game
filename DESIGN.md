# RoboClean — Nhà có chuyện

## Physical scene and register
A player sits at a household workbench in warm afternoon light, checks the robot's enamel control panel, then pilots it through a lived-in home. Paper, steel, engraved labels and ordinary domestic objects anchor the interface. Product register: recognizable controls, quiet feedback, readable missions.

## Palette
- Paper: oklch(93% .016 85)
- Enamel surface: oklch(97% .009 85)
- Charcoal ink: oklch(27% .012 75)
- Secondary ink: oklch(48% .015 75)
- Rule and hardware: oklch(78% .022 80)
- Clay orange, primary actions and dry dirt: oklch(52% .135 44)
- Olive, charging and completion: oklch(44% .065 140)
- Steel blue, wet cleaning and observations: oklch(42% .034 220)
- Rust red, failure and low battery: oklch(48% .13 28)

No neon, glow, decorative glass blur, gradient text or oversized floating dashboards. Mechanical details have a role: rivets anchor panels, engineering grids belong to the assembly drawing, dashed rules perforate diary receipts.

## Typography and layout
Segoe UI / system sans supports Vietnamese without external font requests. Consolas identifies technical drawing labels; Georgia italic introduces diary prose. UI sizes use rem with explicit responsive steps. Main prose stays under roughly 75 characters per line.

The dashboard separates the story and primary action from a robot assembly drawing. A roster and compact chapter strip sit below. Gameplay keeps missions at top left, pin/storage at top right, contextual tools at bottom center, and a dock bearing at bottom left. The center belongs to the house.

## Interaction
- Native buttons, select controls, checkboxes, range sliders and modal dialogs.
- Visible keyboard focus; native Tab navigation; dialogs close with Escape.
- Pointer lock: WASD, mouse look, hold E to vacuum, hold R to mop, C changes camera, wheel zooms, Home recenters, Tab opens settings, Escape pauses.
- Settings persist independently of game saves. Reduced motion respects the OS initially and removes camera shake and decorative bobbing.
- Dirt corners show nearby work areas. Orange means vacuum; steel blue means mop. Double corners identify a two-stage mess. The focused spot receives the strongest line; progress and text carry information beyond color.
- Completing all stains and loose dust requires returning to the dock. A receipt and family story then suspend simulation. The player chooses when to start the next day.
- Completed pages and a pending report survive reloads; the journal reveals completed days only.

## Narrative
Ten authored Vietnamese episodes follow An, Minh, Bắp, Tí and visiting bà Liên. Humor alternates with quiet sadness, ending in a warm homecoming. Dirt and daily modifiers follow domestic events. Later days continue a repeatable slice-of-life loop rather than another authored ten-episode arc.
