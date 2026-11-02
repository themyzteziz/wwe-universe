# Solution design — WWE Universe

## Architecture overview
The existing application, extended with `Booking`, `Product`, `Document`, `Project`, `User`; integrations with LLM.

## Key decisions
| Decision | Reason | Alternatives |
|---|---|---|
| Follow the existing module layout | Familiar to the team, fewer surprises | A new structure |
| Validate input at the API boundary | One place for rules and error messages | Validation in the UI only |
| Outbox for LLM | No lost messages, retries | Synchronous calls only |

## Components by area

### FT-106 Player control and scope
- **US-107** Player plays matches in WWE 2K26 and manually enters results — development

### FT-102 Product vision
- **US-103** Wrestlers develop believable histories — development
- **US-104** Surprise emerges from simulation rules and prior events — development

### FT-109 Simulation engine
- **US-110** Many matches produce no event — configuration
- **US-111** Events are influenced by wrestler history — development

### FT-120 Delivery milestones and acceptance criteria
- **US-121** M2 - Relationships: relationship changes are viewed — development
- **US-122** M3 - Events: the player generate,s accept/reject — development

### FT-124 Out of scope for initial version
- **US-125** These can be explored later, but never block the first working simulation — development
