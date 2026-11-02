# Release 1.0.0 — 2026-11-02

## Highlights
- Simulation engine
- Product vision
- Player control and scope
- Data model and persistence
- Engineering and quality

## Delivered
| Code | Title | Type | Category | Points |
|---|---|---|---|---|
| US-110 | Many matches produce no event | story | configuration | 3 |
| US-103 | Wrestlers develop believable histories | story | development | 5 |
| US-104 | Surprise emerges from simulation rules and prior events | story | development | 5 |
| US-107 | Player plays matches in WWE 2K26 and manually enters results | story | development | 5 |
| US-111 | Events are influenced by wrestler history | story | development | 5 |
| US-114 | Stable wrestler IDs are independent of wrestler names to support renames | story | development | 5 |
| US-117 | Keep the app functional without paid AI APIs | story | development | 5 |
| US-118 | Avoid embedding API secrets in browser bundles or localStorage | story | development | 5 |
| US-121 | M2 - Relationships: relationship changes are viewed | story | development | 5 |
| US-122 | M3 - Events: the player generate,s accept/reject | story | development | 5 |
| US-125 | These can be explored later, but never block the first working simulation | story | development | 5 |
| US-128 | Relationships evolve naturally based on match results | story | development | 5 |
| US-129 | **Goal:** Create a living WWE Universe where anything happen,s wrestlers develop | story | development | 5 |

## Checks on the release
Simulated checks:
✅ lint (`npm run lint --silent`) — exit 0, 0.0 s
✅ build (`npm run build --silent`) — exit 0, 0.0 s

## Smoke test results
| Code | Result | Note |
|---|---|---|
| US-110 | ✅ | Critical path verified |
| US-103 | ✅ | Critical path verified |
| US-104 | ✅ | Critical path verified |
| US-107 | ✅ | Critical path verified |
| US-111 | ✅ | Critical path verified |
| US-114 | ✅ | Critical path verified |
| US-117 | ✅ | Critical path verified |
| US-118 | ✅ | Critical path verified |
| US-121 | ✅ | Critical path verified |
| US-122 | ✅ | Critical path verified |
| US-125 | ✅ | Critical path verified |
| US-128 | ✅ | Critical path verified |
| US-129 | ✅ | Critical path verified |

## Known issues
- None.

## Rollback plan
Revert the release commit and redeploy the previous tag.
