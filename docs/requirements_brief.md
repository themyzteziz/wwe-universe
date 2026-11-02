# Requirements Brief

Source: WWE_Universe_AI_Simulation_Requirements.pdf (Draft v1.0) + product owner description. Repo: themyzteziz/wwe-universe, branch `agentstudio` only (never `main`). This is a LIVE implementation: working React features, runnable with `npm run dev`.

## Goal
For the single player of WWE 2K26 Universe Mode: extend the existing booking assistant into a persistent simulation where relationships, rivalries, factions and match-adjacent events emerge from history, while the player keeps full control of match results, titles and booking.

## In scope
- Preserve BOOKING (3-week rotation 1v1/3MAN ELI/4MAN ELI, random generator, win controls, statuses) and WRESTLERS (add/remove, notes) views and localStorage roster.
- Stable wrestler IDs, versioned storage, lossless migration of legacy roster.
- Entities: Wrestler, MatchResult, Event, Relationship, Faction, Storyline, UniverseSettings.
- Relationships: scored, directed, with states ally/neutral/rival/enemy, with change history (event ID, week, match, participants).
- Simulation engine: event types (confrontation, interference, save, ambush, respect gesture, betrayal, return, faction development), probabilities, rarity tiers, cooldowns, anti-repetition, history/relationship/feud-aware, seeded RNG, deterministic state change separate from description text.
- Proposal flow: accept / reject / reroll, shows affected wrestlers and expected relationship changes.
- UNIVERSE view: relationship profiles, chronological timeline, settings (event frequency, chaos, history sensitivity).
- JSON export/import of Universe data.
- Optional AI text descriptions (default: built-in templates; app fully works offline/without keys).
- Tests: Vitest + React Testing Library; React 19 + Vite; GitHub Pages workflow still green; lint and build pass.

## Out of scope
Automatic match-result simulation, autonomous booking, multiplayer sync, cloud accounts, mandatory paid LLM, building/hosting an AI backend (only a client-side optional hook), real-world WWE affiliations.

## Actors and permissions
- Player (only user): full control; accepts/rejects/rerolls proposals; enters all results; decides title shots/PPV.
- Simulation: may only propose; MUST NOT change wins, title ownership or title-shot status without explicit player acceptance of a clearly shown change (assumption: v1 events never touch these at all).

## Behaviours (normal path / edge cases)
- Migration: legacy roster found, no new-format data → convert, assign stable IDs, keep wins/status/champion/notes, keep a backup copy of the legacy key. Edge: corrupt JSON, empty roster, already migrated (idempotent), duplicate names, storage unavailable/full.
- Result entry: player picks winner(s) → MatchResult stored (week, type, participants, winners). Edge: undo/correct a result; no result = no event.
- Event proposal: after result recorded (and manual button) engine rolls; most rolls → none. Edge: too few wrestlers, all on cooldown, repeated pair/type, contradictory state (e.g. betrayal between non-allies) blocked.
- Accept → apply relationship deltas + log Event; reject → log rejected (counts for anti-repetition lightly), no state change; reroll → new proposal with new seed step.
- Export/import: schema-version checked, validation errors shown, import replaces after confirmation, nothing partially applied.
- Notes remain free text, separate from events.

## Constraints
React 19 + Vite (verify package compatibility first), static hosting on GitHub Pages (base path unchanged), localStorage only, no secrets in bundle/localStorage, `npm run lint` and `npm run build` pass, dark red-accented responsive UI, seeded RNG for deterministic tests.

## Dependencies
Existing code in repo (to be reviewed by architect); existing GitHub Actions Pages workflow; previous planning docs (reference only).

## Assumptions
- A1: Proposals roll automatically after each recorded result when enabled (default on) plus a manual "Generate event" button.
- A2: Relationship scale is integer −100..+100; states: enemy ≤ −60, rival −59..−20, neutral −19..19, ally ≥ 20 (alliance ≥ 60 "close ally" not needed). Directed scores stored per ordered pair.
- A3: Title-shot status and champion flags are read-only for the simulation; events may reference them for flavour/eligibility (e.g. champion can be target of ambush) but never mutate them.
- A4: Factions: 2–5 members, formed only through accepted faction events or manual creation; auto-dissolve proposal when average internal score < 0.
- A5: Default AI text provider = templates; optional provider calls a user-entered HTTPS endpoint with no key stored by the app.
- A6: Weeks are an integer counter taken from the existing rotation.
- A7: Defaults: event frequency 25% per match, chaos 50, history sensitivity 50.

## Open questions
See ask_human records: trigger mode, title-shot interaction, optional AI backend handling.

## Manual steps
None required in repo. GitHub Pages is already configured; optional AI backend (secrets/hosting) is out of scope and is a question for the PO.
