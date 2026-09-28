# RoboClean (robo-game) — Product Context

## Product purpose
RoboClean is a compact third-person household cleaning game. The player pilots Rô, a small robot, through a lived-in home while following the family of An, Minh, Husky Bắp and mouse Tí. Each day introduces floor stains, loose dust and light hazards. The loop is: move, choose the correct cleaning tool, clear the room, return to the dock, read the family's next diary page, then choose to start another day.

## Users
- **Primary**: casual players who want quick, satisfying “clean-up” sessions with simple controls.
- **Secondary**: creators (students/hobbyists) iterating on 3D game feel and UI feedback loops.

## Platform & constraints
- **Platform**: web (Three.js + Vite), keyboard and mouse, pointer-lock gameplay.
- **Constraints**: fast iteration, minimal screens, very readable HUD over a 3D scene, dark background is typical but not mandatory.

## Brand / tone
- **Tone**: warm Vietnamese domestic storytelling; playful observations alternate with gentle family drama.
- **Personality**: tactile household machinery, a small workshop, paper diaries and dry humor.
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
- **Settings**: persistent audio, camera sensitivity/FOV/mode/inversion, dirt outlines and reduced motion.
- **After each day**: cleaning receipt, character dialogue and story; manually continue.
- **Journal**: read completed pages without revealing unfinished episodes.

## Non-goals
- Complex inventory systems.
- Long cutscenes or dialogue trees.

## Register
product

