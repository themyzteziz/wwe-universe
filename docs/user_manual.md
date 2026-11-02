# User manual

## Table of contents

No end-user chapters yet. US-113 is a internal data-model change with no user-visible behaviour, so the manual is unchanged.

## Event types and rarity

Storyline events are not yet visible in the app. The event types and their rarity are defined in the simulation configuration; the screens to view and generate events come in later releases.

What to expect in this release:

| Rarity | Event types | Meaning |
|---|---|---|
| Common | Confrontation, Respect | Frequent, low-stakes moments |
| Uncommon | Interference, Save, Ambush | Occasional moments that depend on existing relationships |
| Rare | Betrayal, Faction | Rare moments that build on past storylines |

- Your booking decisions are never changed automatically. Events only suggest; you confirm.
- The "Return" event type is not active in this version because no wrestler is marked inactive.

## Upgrading from the previous version

Your roster carries over automatically the first time you open the upgraded app. You do not need to do anything.

What is kept:

| Item | Result after upgrade |
|---|---|
| Wrestler names | Kept |
| Wins | Kept (missing values show as 0) |
| Status (available, title-shot, used) | Kept (unknown values become available) |
| Champion flag | Kept |
| Notes (including `*` and `WILL RETURN`) | Kept |
| Current week | Kept (if missing or invalid, the week is 1) |

Steps:
1. Open the app after the upgrade.
2. Check your roster. Every wrestler from before should be listed.

Tips:
- Your old data is not deleted. The app keeps a backup copy of it in the browser storage.
- If two wrestlers have the same name, both are kept as separate entries.

Warnings:
- If the saved roster data is damaged, the app starts with an empty roster and shows a notice. Your original data is kept in the backup and is not lost.
- If a newer version of the app has already saved your data, the app does not overwrite it. It shows a notice and does not save changes until the data is fixed.
