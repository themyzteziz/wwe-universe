# User manual

## Table of contents

1. Event types and rarity
2. How to save and reload your universe
3. Upgrading from the previous version

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

## How to save and reload your universe

Your universe is saved automatically. You do not need a save button.

1. Make a change, for example add a wrestler or change a win count.
2. Wait a moment. The change is saved about 0.3 seconds after your last edit.
3. Refresh the page. Your wrestlers, notes, wins, statuses, champion flags and current week are still there.

**Tips**
- Close or refresh the page only after a short pause, or simply wait a second before leaving. The app also saves when you leave the page.
- Your universe is stored in this browser only. Another browser or another tab does not see your changes. If you edit in two tabs at once, the last change written wins.

**Warnings**
- **"Changes may not be saved"** (yellow banner): the browser could not store your data, for example because storage is full or disabled. The app keeps working, but changes after this point are only kept until you close the page. Free browser storage or enable site storage, then reload.
- **Read-only warning**: the saved universe could not be read, for example because it was damaged or made by a newer version of the app. Nothing is written over it, so your saved data is protected. Check the banner for the next step before you make further changes.
- **Migration notice** (dismissible banner): shown once when an older saved universe was upgraded. You can close it.
