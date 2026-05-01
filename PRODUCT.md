# RoboClean (robo-game) — Product Context

## Product purpose
RoboClean is a compact first-person cleaning game where the player pilots a small autonomous robot inside a home. Each day escalates the mess (floor stains + dust particles) and introduces light hazards (Husky collisions, battery management). The core loop is: move, choose the correct cleaning tool, clear the room, advance the day.

## Users
- **Primary**: casual players who want quick, satisfying “clean-up” sessions with simple controls.
- **Secondary**: creators (students/hobbyists) iterating on 3D game feel and UI feedback loops.

## Platform & constraints
- **Platform**: web (Three.js + Vite), keyboard and mouse, pointer-lock gameplay.
- **Constraints**: fast iteration, minimal screens, very readable HUD over a 3D scene, dark background is typical but not mandatory.

## Brand / tone
- **Tone**: playful “tech protocol”, arcade-sim flavor, short punchy copy, a little cheeky but not cringe.
- **Personality**: compact, sharp, “systems UI” without sterile corporate vibes.
- **Avoid**: generic sci-fi HUD clichés, heavy glass blur everywhere, overly neon-on-black cyberpunk overload, meme-y emojis.

## Strategic principles
- **Clarity wins**: in-game readability beats ornamentation.
- **Feedback is fun**: every state change should feel tactile (charging, cleaning, bumping, day start).
- **Progress feels like a story**: day-to-day escalation should have a narrative hook, not only higher counts.

## IA / surfaces
- **Start / hub**: start, continue, replay day, reset run.
- **Loading**: minimal, fast, progress-visible.
- **In-game HUD**: energy, storage, day/story, mission, dirt remaining, status.
- **Pause**: resume, restart day, restart run, controls hint.

## Non-goals
- Complex inventory systems.
- Long cutscenes or dialogue trees.

## Register
product

