# Project brief — WWE Universe

_Derived from **Requirements** (WWE_Universe_AI_Simulation_Requirements.pdf)._

## Goal
WWE 2K26 Universe - team requirements 1 WWE 2K26 Universe Mode AI-driven simulation | Team requirements specification | Draft v1.0

## Scope
- **Product vision** — Product vision
- **Player control and scope** — Player control and scope
- **Simulation engine** — Simulation engine
- **Data model and persistence** — Data model and persistence
- **Engineering and quality** — Engineering and quality
- **Delivery milestones and acceptance criteria** — Delivery milestones and acceptance criteria
- **Out of scope for initial version** — Out of scope for initial version
- **Open design decisions for the team** — Open design decisions for the team

## Personas
| Persona | Main needs |
|---|---|
| Agent | — |
| User | — |

## Business processes (to-be)
1. **Product vision:** wrestlers develop believable histories; surprise emerges from simulation rules and prior events.
2. **Player control and scope:** player plays matches in wwe 2k26 and manually enters results.
3. **Simulation engine:** many matches produce no event; events are influenced by wrestler history.
4. **Data model and persistence:** stable wrestler ids are independent of wrestler names to support renames.
5. **Engineering and quality:** keep the app functional without paid ai apis; avoid embedding api secrets in browser bundles or localstorage.
6. **Delivery milestones and acceptance criteria:** m2 - relationships: relationship changes are viewed; m3 - events: the player generate,s accept/reject.
7. **Out of scope for initial version:** these can be explored later, but never block the first working simulation.
8. **Open design decisions for the team:** relationships evolve naturally based on match results; **goal:** create a living wwe universe where anything happen,s wrestlers develop.

## Data entities
`Booking`, `Product`, `Document`, `Project`, `User`

## Integrations
- LLM

## Non-functional requirements
- Every API error is returned as JSON with a clear message

## Assumptions
- The repository's existing stack and conventions are kept.
- Open questions are answered before development of the affected stories.

## Out of scope
- Anything not described in the source document.
