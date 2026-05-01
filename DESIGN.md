# RoboClean — Design Context

## Scene sentence (forces theme)
A player in a dim room at night, focused on the floor and obstacles in a small 3D house, needs HUD text that stays crisp over noisy geometry while still feeling like a playful “systems console”.

## Theme
Dark, but not pure-black; neutrals are slightly tinted. Accents are restrained and purposeful.

## Color strategy
Restrained: tinted neutrals + one primary accent, plus semantic danger/success.

## Color tokens (OKLCH)
- **bg**: oklch(0.14 0.02 255)
- **panel**: oklch(0.20 0.03 255 / 0.82)
- **border**: oklch(0.46 0.05 255 / 0.35)
- **text**: oklch(0.92 0.02 255)
- **textDim**: oklch(0.78 0.03 255)
- **accent**: oklch(0.82 0.15 200)
- **success**: oklch(0.82 0.16 155)
- **danger**: oklch(0.68 0.20 25)

## Typography
- **Body**: Inter, system-ui, sans-serif
- **Numbers / labels**: JetBrains Mono for compact meter text
- **Hierarchy**: clear step-ups, no gradient text

## UI principles
- Don’t stack “cards on cards”.
- Strong rhythm: varied spacing, not uniform padding everywhere.
- Motion: small, purposeful, ease-out; avoid bouncy gimmicks.

## HUD layout
- Corners hold persistent stats.
- Bottom center holds action hints.
- One “story line” per day, short, always visible but quiet.

