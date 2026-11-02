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

### FT-113 Data model and persistence
- **US-114** Stable wrestler IDs are independent of wrestler names to support renames — development
