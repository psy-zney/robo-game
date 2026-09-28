# RoboClean — Nhà có chuyện

The interface is a household workshop: ivory enamel, charcoal ink, clay-orange buttons, olive charging markers, engraved labels, rivets and an authored exploded robot drawing. Gameplay stays visible between compact corner instruments.

## Controls
| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Look around |
| Hold E | Vacuum dry dust |
| Hold R | Mop liquids and remaining film |
| C | Follow / overhead camera |
| Wheel | Zoom |
| Home | Reset camera framing |
| Tab | Open settings |
| Escape | Pause / close a dialog |

Settings save automatically on this device. They include music/SFX toggles, master volume, music selection, camera sensitivity, FOV, vertical inversion, dirt outlines and reduced motion. Music selection changes during the session; the remaining preferences survive reloads.

## Cleaning feedback
Broken corner outlines expose nearby work areas without painting over the stain. Orange identifies a vacuum step, steel blue identifies mopping, and double corners identify a mixed stain. Focus increases outline opacity. Text names the dirt, required key and remaining passes; the small bar shows completed passes. Full storage blocks vacuuming, but mopping can continue. Returning to the olive dock and releasing the tools recharges the robot and empties storage.

## Family diary
| Day | Episode | Mood | Cleaning cause |
| --- | --- | --- | --- |
| 1 | Một thành viên mới | Funny | Robot arrives, ordinary dust |
| 2 | Cà phê nguội trên sàn | Sad | Minh loses work shifts and spills coffee |
| 3 | Vụ án sốt cà chua | Funny | An tests savory pastries; Minh spills sauce |
| 4 | Dấu chân về muộn | Sad | Job hunting in the rain, muddy footprints |
| 5 | Mẻ bánh đầu tiên | Funny | The first bakery order leaves flour film |
| 6 | Chiếc ghế cạnh cửa sổ | Sad | Bắp misses bà Liên and becomes restless |
| 7 | Sinh nhật không có nến | Funny | A surprise birthday and a job offer |
| 8 | Chiếc hộp trên gác | Sad | Renovation reveals An's late mother's photos |
| 9 | Cả nhà trú mưa | Funny | A leaking window, Tí's improvised boat, 70% battery |
| 10 | Một chỗ để trở về | Warm | Grandmother returns for the first open sale |

Finishing both types of mess and returning to the dock opens a story receipt. Simulation and battery consumption stop while reading. “Sang ngày tiếp theo” starts the next checkpoint; it does not skip the story automatically.

Save data keeps an explicit set of completed days and the pending receipt, including its statistics. Continuing after a reload reopens an unread receipt. Replaying a day keeps previously unlocked pages. Legacy checkpoints infer completed pages from earlier reached days. Beyond day 10, repeatable domestic episodes alternate funny and quiet moods.

## Verification
- TypeScript production build.
- Unit coverage for missions, navigation, storage, cleaning steps, animation mapping, camera limits, settings validation and save/report persistence.
- Browser coverage for desktop/mobile dashboard, settings persistence, camera/zoom/Tab, pause behavior, dirt outlines, reload during a receipt, and actual cleaning interactions across the ten-day arc.

Browser tests drive real cleaning logic at reachable positions while paused and keep the Husky stationary for deterministic completion. They verify the state transitions and interface; they do not establish how enjoyable the full campaign feels to a human player.
