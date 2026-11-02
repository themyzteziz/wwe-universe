# Project Brief

## Goal
Turn the existing React+Vite WWE 2K26 Universe Booking Assistant into a persistent simulation of relationships, rivalries, factions and match-adjacent events. The player still plays matches in WWE 2K26 and enters all results; the simulation only proposes. Live implementation on branch `agentstudio` (never `main`); success = `npm run dev` shows working features.

## Scope
See requirements brief. In: migration, stable IDs, relationships, engine, proposals, UNIVERSE view, settings, export/import, optional AI text, tests. Out: auto result simulation, autonomous booking, multiplayer, cloud accounts, mandatory paid LLM, AI backend hosting.

## Personas
- Player/booker (sole user).

## Business processes
1. Book: rotation → random match generator → player plays match in 2K26.
2. Record result: player marks winner(s) → MatchResult stored (week, type, participants).
3. Simulate: after result (or manually) engine rolls; usually no event.
4. Review: proposal shows type, wrestlers, description, expected relationship changes → Accept / Reject / Reroll.
5. Continue: accepted events update relationships/factions/storylines, appear in timeline, bias future selection.
6. Backup: export JSON / import on another browser.

## Data entities
Wrestler (stable id, name, status, wins, champion flag, notes), MatchResult, Event (id, type, week, participants, state proposed/accepted/rejected, seed, deltas, description), Relationship (from, to, score, state, history[]), Faction, Storyline, UniverseSettings; schemaVersion.

## Integrations
None required. Optional: user-supplied HTTPS endpoint for AI descriptions (no secrets stored).

## Non-functional requirements
React 19 + Vite, Pages-compatible static build, localStorage, seeded RNG, Vitest+RTL, lint/build green, dark red responsive UI, no secrets in bundle.

## Assumptions
A1–A7 in requirements brief (auto trigger after result + manual; scale −100..100; title status read-only; faction rules; template-first AI; defaults 25/50/50).

## Manual steps
None identified. GitHub Pages already configured. AI backend question pending with PO; if wanted it would be tagged "Manual step".

## Out of scope
As above.

## Milestone mapping
M1 EP-101 · M2 EP-102 (+profiles) · M3/M4 EP-103 · M5 EP-104.
