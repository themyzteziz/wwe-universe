# US-119 — Test report (iteration 2)
**Verdict:** ✅ Approved · **Tester:** Cuélebre · **Date:** 2026-11-02

## Summary
| Check | Result | Evidence |
|---|---|---|
| run_checks (lint, test, build) | ✅ | all exit 0 |
| AC 1 Profile | ✅ | RelationshipProfile.jsx SECTIONS order, sort by |score| then name, neutral filtered by history; tests for order, hidden sections, neutral cancel, empty neutral |
| AC 2 Explanation | ✅ | button aria-expanded, byWeek oldest-first, Week/signed delta/reason/Event or Match label; tests incl. out-of-order storage |
| AC 3 Empty | ✅ | "No history yet", "No wrestlers yet"; tests |
| AC 4 Rename | ✅ | nameOf + "(former)" suffix; rename and removeWrestler tests |
| AC 5 Persistence | ✅ | remount from stored universe gives identical HTML |
| AC 6 Notes separate | ✅ | own Notes block; test asserts not in history |
| AC 7 Read-only | ✅ | only expander buttons, no inputs; test |

## Notes
CSS-variable and PROFILES-nav deviations were approved by the product owner. Remember to move Profiles into the UNIVERSE shell later.
