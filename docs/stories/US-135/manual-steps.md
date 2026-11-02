# Manual steps — US-135

No pre- or post-deployment steps.

## Recovering the pre-import safety copy (no restore UI in v1)
1. Open the browser developer tools > Application > Local Storage for the app.
2. Copy the value of `wwe-universe-v2.pre-import`.
3. Paste it as the value of `wwe-universe-v2` and reload the page.

The slot holds one copy only; every import overwrites it. If the universe was unreadable (read-only mode), the slot holds that raw unreadable document.
