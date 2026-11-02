# Solution design — WWE Universe (WUAS)

## Architecture overview
Static React 19 + Vite single-page app (GitHub Pages, base `/wwe-universe/`). No backend. State lives in `App.jsx` (`useState`) and is persisted to `localStorage`. The player plays matches in WWE 2K26 and enters results; the simulation only proposes. The earlier draft of this document (Booking/Product/Document/Outbox/LLM) did not describe this repository and is replaced.

## Repository reality (as of FT-106 refinement)
- App code is at the repo root: `App.jsx`, `main.jsx`, `components/`, `data/wrestlers.json`, `index.css`. There is no `src/App.jsx`.
- `src/**/*.ts` and `test/**/*.ts` are unrelated generated stubs. They are excluded from ESLint and Vitest; recommend deleting them in a separate cleanup.
- `dist/` is committed and ignored by ESLint.
- `eslint.config.mjs` is Next.js-based and broken (missing dependency); US-116 replaces it.

## Module map
| Module | Role |
|---|---|
| `App.jsx` | Owns `currentWeek`, `wrestlers`, `matchResults`; persistence effects; page switch |
| `components/MatchGenerator.jsx` | Random match generation; Winner and Undo controls (US-117) |
| `components/RosterTable.jsx` | Wins +/−, status, champion controls (unchanged) |
| `components/WrestlersManager.jsx` | Add/edit wrestlers |
| `universe/matchResults.js` (new, US-117) | Pure helpers for MatchResult load/create/apply wins |
| `vitest.setup.js`, `*.test.js(x)` (new, US-116) | Test tooling, colocated tests |

## Data model
| Entity | Storage key | Fields |
|---|---|---|
| Wrestler | `wrestlers` | name, wins, status (`available`/`title-shot`/`used`), champion, note |
| Current week | `currentWeek` | number |
| MatchResult | `matchResults` | id, week, type, participantIds (names until stable IDs), winnerIds, createdAt |

Later features add stable ids, schemaVersion, events, relationships, factions, storylines.

## API inventory
No network APIs. In-process: `recordResult(match, winnerName)`, `undoLastResult()` in `App.jsx`.

## Security model
Single local user; no secrets in bundle; JSON from localStorage parsed defensively. Optional AI endpoint later is user-supplied HTTPS, no keys stored.

## Integration inventory
None required.

## Components by feature
- **FT-106 Stack baseline, test tooling and match results**
  - **US-116** React 19 baseline, Vitest + RTL, working flat ESLint config — devops
  - **US-117** Record structured match results from a Winner control in the Match Generator, undo last — development
- Other features (FT-102, FT-109, FT-120, FT-124, FT-127: US-103, 104, 107, 110, 111, 121, 122, 125, 128, 129) not yet refined.

## Key decisions
| Decision | Reason | Alternatives |
|---|---|---|
| Keep root layout and `useState` + localStorage pattern | Matches the code; minimal change | Reducer/context, `src/` move |
| Winner control in the Match Generator, roster +/− untouched | A result needs a generated match context; existing behaviour must stay | Hooking MatchResult into +/− (no participants known) |
| `participantIds` hold names for now | No stable ids exist yet; field name stays stable for migration | Introduce ids inside US-117 (scope creep) |
| Exclude `src/` and `test/` stubs from lint and tests | Unrelated and non-runnable | Delete now (separate cleanup) |
| Replace Next ESLint config with Vite/React flat config | Current one cannot load | Install eslint-config-next (wrong stack) |
| Pin vite and plugin-react | `latest` is non-reproducible and may outrun Vitest | Keep `latest` |
| Undo returns through one function | Hook for `sourceUndone` in the events story | Delete events on undo |

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vite/Vitest version mismatch | Medium | Broken checks | Pin Vite, pick compatible Vitest |
| Name-based ids break on rename | Certain later | Migration | Stable-ID story maps names |
| Stub files pollute checks | High | Red checks | Explicit excludes |
