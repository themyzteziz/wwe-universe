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

## Wrestler relationship profiles

## How to view a wrestler's relationships

1. Open the **PROFILES** page from the main navigation.
2. In the **Wrestler** list, select a wrestler. If the roster has wrestlers, the first one by name is shown by default.
3. The profile shows up to four sections, in this order:
   - **Allies**
   - **Rivals**
   - **Enemies**
   - **Neutral** (only relationships that have history, even if the score is now 0)

   Empty sections are hidden. Within each section, the strongest relationship (largest absolute score) is listed first. Each row shows the counterpart's name, score and a state badge (Ally, Rival, Enemy or Neutral).
4. To see why a relationship changed, click a row. Its history expands, oldest entry first. Each entry shows:
   - the week,
   - the change in score (with a + or − sign),
   - the reason,
   - the linked event or match, when there is one.
5. Click the row again to collapse it.

**Notes**
- The wrestler's notes appear in a separate **Notes** block. They are never mixed into the relationship history.
- Former counterparts (wrestlers removed from the roster) are shown with their last name followed by "(former)".

**Tips**
- If a wrestler has no relationships, the profile shows "No history yet". If the roster is empty, it shows "No wrestlers yet".
- The profile is read-only. To change relationships, record the result of a match or event; the profile then reflects the change.
- The profile content is the same after you reload the page.

## How to record a match result and undo it

Use this after you have played a match in WWE 2K26 and want to log the winner in the Universe.

1. On the **Match Generator**, click **Generate Match** (or **Reroll**) to create a match.
2. Play the match in WWE 2K26 and note the winner.
3. Click **Winner** next to that wrestler's name.
4. The panel shows **Result recorded: {name}**. The wrestler's **Wins** count goes up by 1. The Winner buttons are disabled for this match, so the same result cannot be recorded twice.

**Tips**
- Generating or rerolling a match does not record anything. Only the **Winner** button records a result.
- Changing the week or rerolling clears the result panel. The recorded result stays in your history.
- The **Wins** count in the roster is changed only by the result buttons and the +/− buttons. Status and champion settings are not affected.

**To undo the last result**
1. Look for **Undo last result**. It appears only when at least one result is recorded and shows the last one, for example "Week 3 1v1: John won".
2. Click **Undo last result**. The most recent result is removed and that wrestler's **Wins** count goes down by 1 (never below 0).
3. Click again to undo the previous result. When no results remain, the button disappears.

**Warning**
- Undo removes only the result record and the win. It does not change anything else. If a winner has been removed from the roster, the result is still removed.
- Your results are saved with your universe and remain after you reload the page.
