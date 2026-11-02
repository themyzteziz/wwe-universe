# Delivery Plan — WUAS (WWE Universe AI Simulation)

## Summary
- **Scope:** 26 stories (US-113 … US-138) across features FT-105 to FT-112. Live branch `agentstudio`.
- **Total points:** 95 (Fibonacci per story, max 5 per story; no story above 8).
- **Sprints:** 5 sprints of 2 weeks at 20-point capacity (max 110% = 22). Sprint loads: S1 19, S2 17, S3 18, S4 21, S5 20.
- **Key risks:** dependency on the schema/persistence foundation (US-113, US-115); the event pipeline (US-124 → US-128) is the critical chain; title-shot suggestions must never change champions or title state without explicit confirmation.

## Sprint plan

| Sprint | Stories | Points | Goal |
|---|---|---|---|
| 1 | US-116, US-122, US-113, US-115, US-123, US-117 | 19 | Foundations: test tooling, stable-ID Universe schema, persistence provider, seedable RNG, event catalogue, structured match results |
| 2 | US-114, US-118, US-131, US-134, US-119 | 17 | Legacy roster migrated; relationship model live; UNIVERSE shell; JSON export; relationship profile view |
| 3 | US-120, US-121, US-124, US-125 | 18 | Factions, storyline threads, eligibility/cooldowns and history-aware weighted selection |
| 4 | US-126, US-127, US-128, US-129, US-132 | 21 | Consequences and delta preview, template descriptions, proposal workflow and review panel, timeline |
| 5 | US-133, US-130, US-135, US-136, US-137, US-138 | 20 | Settings panel, continuity acceptance tests, JSON import, optional AI hook, responsive/error handling, CI and Pages check |

## Rank and dependency order

| Rank | Code | Pts | MoSCoW | Priority | WSJF | Sprint | Depends on |
|---|---|---|---|---|---|---|---|
| 1 | US-116 | 3 | Must | 1 | 6.7 | 1 | — |
| 2 | US-122 | 2 | Must | 1 | 9.5 | 1 | — |
| 3 | US-113 | 3 | Must | 1 | 8.0 | 1 | — |
| 4 | US-115 | 5 | Must | 1 | 4.4 | 1 | US-113 |
| 5 | US-123 | 3 | Must | 1 | 6.0 | 1 | — |
| 6 | US-117 | 3 | Must | 1 | 6.3 | 1 | US-115 |
| 7 | US-114 | 5 | Must | 2 | 3.6 | 2 | US-113, US-115 |
| 8 | US-118 | 5 | Must | 2 | 3.4 | 2 | US-115, US-117 |
| 9 | US-131 | 2 | Must | 2 | 6.5 | 2 | US-115 |
| 10 | US-134 | 2 | Should | 3 | 7.0 | 2 | US-115 |
| 11 | US-119 | 3 | Should | 3 | 3.7 | 2 | US-118 |
| 12 | US-120 | 5 | Should | 3 | 2.4 | 3 | US-115 |
| 13 | US-121 | 3 | Should | 3 | 4.0 | 3 | US-118, US-120 |
| 14 | US-124 | 5 | Must | 2 | 3.6 | 3 | US-118, US-121, US-123 |
| 15 | US-125 | 5 | Must | 2 | 3.6 | 3 | US-122, US-124 |
| 16 | US-126 | 5 | Must | 2 | 3.4 | 4 | US-118, US-125 |
| 17 | US-127 | 3 | Must | 2 | 4.7 | 4 | US-126 |
| 18 | US-128 | 5 | Must | 1 | 4.2 | 4 | US-115, US-125, US-127 |
| 19 | US-129 | 5 | Must | 2 | 3.8 | 4 | US-128 |
| 20 | US-132 | 3 | Should | 3 | 3.7 | 4 | US-131 |
| 21 | US-133 | 3 | Must | 2 | 5.3 | 5 | US-131, US-128 |
| 22 | US-130 | 3 | Must | 2 | 6.3 | 5 | US-116, US-128 |
| 23 | US-135 | 5 | Should | 3 | 2.8 | 5 | US-113, US-134 |
| 24 | US-136 | 3 | Could | 4 | 2.0 | 5 | US-127 |
| 25 | US-137 | 3 | Must | 2 | 5.3 | 5 | US-131, US-129 |
| 26 | US-138 | 3 | Must | 2 | 6.3 | 5 | US-116, US-130 |

## Critical path
US-113 → US-115 → US-117 → US-118 → US-121 (with US-120) → US-124 → US-125 → US-126 → US-127 → US-128 → US-129 → US-137; and US-116 → US-130 → US-138 for the test and CI chain.

The longest chain is the simulation pipeline: US-123/US-122 → US-124 → US-125 → US-126 → US-127 → US-128. Any slip there moves the event proposal flow (FT-110) and the review panel.

## Milestones
- **MVP (end of Sprint 4):** a match result can produce a proposed event, with accept, reject, reroll and review. The relationship model, factions and storylines are in place.
- **UAT (end of Sprint 5):** settings, timeline, continuity acceptance tests, import/export, responsive layout and CI are complete. Ready for UAT sign-off.
- **Go-live:** after UAT, release manager runs smoke tests on the GitHub Pages build.

## Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Schema change after persistence is built (US-113/US-115) | Rework across S1–S5 | Freeze schema in S1 per design R1; migrations versioned |
| Pipeline chain US-124→US-128 overruns | MVP slips | Sprint 4 capacity is 21 (105%); US-132 can move to S5 if needed |
| Title-shot suggestions accidentally mutate title state | Breaks owner requirement | Read-only title data in US-126/US-128/US-129; acceptance test in US-130 |
| React 19 upgrade breaks existing UI | Regression in S1 | US-116 first; US-130/US-138 run the test suite |
| Import of malformed JSON corrupts data | Data loss | Validation in US-135; export (US-134) available before import |
| AI hook leaks secrets | Security issue | US-136 is Could; no secrets in browser; template fallback always works |

## Assumptions
- Capacity is 20 points per sprint for the AI team (default); no other capacity constraints were given.
- Story points are relative estimates and may be re-planned after Sprint 1 velocity is known.
- Matches are still entered manually by the player in WWE 2K26; no external data source is used.
- Event auto-roll defaults to on (per product owner answer); manual Generate Event button is always available.
- No backend is built or deployed in v1; AI is an optional client hook only.
- Title-shot changes are suggestions only and always need explicit player confirmation.
