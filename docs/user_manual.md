# User manual

## Table of contents

1. Event types and rarity
2. How to save and reload your universe
3. Upgrading from the previous version
4. Wrestler relationship profiles
5. How to record a match result and undo it
6. How to open the UNIVERSE view
7. How to view the universe timeline
8. How to import a backup file

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
- **Read-only warning**: the saved universe could not be read, for example because it was damaged or made by a newer version of the app. Nothing is written over it, so your saved data is protected. Import a backup file (see "How to import a backup file") to replace it.
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

## How to open the UNIVERSE view

1. Click the **UNIVERSE** tab in the top navigation, next to **BOOKING** and **WRESTLERS**.
2. Choose a sub-tab: **Timeline**, **Relationships**, **Settings** or **Backup**. **Timeline** opens by default.
3. **Relationships** and **Settings** show "coming soon" until their panels are delivered.

**Tip:** A number badge on the **UNIVERSE** tab shows how many event proposals are waiting for your review. The badge disappears when there are none.

**Tip:** On narrow screens the tabs wrap onto several lines instead of scrolling the page sideways.

## How to view the universe timeline

Use the Timeline to review how your universe unfolded.

1. Open the **UNIVERSE** view and select the **Timeline** tab.
2. Entries are listed newest first. Click the order button to show oldest first; click it again to switch back.
3. To narrow the list, use the filters:
   - **Week from** and **Week to** — show only entries within this week range. If the "from" week is greater than the "to" week, a message appears and no filter is applied.
   - **Wrestler** — show only entries that include this wrestler.
   - **Event type** — show only events of this type. Match results are hidden while an event type is selected.
4. Rejected events are hidden by default. Tick **Show rejected** to display them. They appear dimmed and marked **Rejected**.
5. The list shows 50 entries per page. Use **Next** and **Prev** to move between pages. Changing any filter returns you to page 1.

Tips:
- If no entries exist yet, the timeline shows "Nothing has happened yet".
- If your filters hide every entry, the timeline shows "No entries match these filters". Clear a filter to see more.
- The timeline is read-only. You cannot edit or delete entries here.

## How to import a backup file

Use this to restore a universe from a file you exported earlier, or to move your universe to another browser.

1. Open **UNIVERSE** > **Backup**.
2. Under **Import**, choose the backup file (`.json`).
3. If the file is valid, the app asks: "Replace current universe (X wrestlers, Y events) with file (A wrestlers, B events)?" Click **Replace universe** to continue or **Cancel** to keep everything as it is.
4. After you confirm, the universe is replaced, the timeline and relationship history from the file are shown, and automatic saving continues.

**What is kept and what is not**
- A safety copy of your current universe is stored first, in the browser storage key `wwe-universe-v2.pre-import`. Each import overwrites the previous safety copy.
- AI settings are never imported. After an import, AI descriptions are off and no AI address is set, whatever the file says.
- Old roster files from the previous version of the app are accepted and converted.

**To get your previous universe back**
There is no restore button yet. In your browser's developer tools (Application > Local Storage), copy the value of `wwe-universe-v2.pre-import` into the key `wwe-universe-v2`, then reload the page.

**Warnings**
- **"This file cannot be imported"**: the file is not valid JSON, is larger than 5 MB, was made by a newer version of the app, or has damaged data (for example a reference to a wrestler that does not exist). The list shows up to 20 problems. Your current universe was not changed.
- **"No safety copy ... could be kept"**: browser storage is full, so the safety copy could not be written. Cancel and use **Export** first to keep your current universe, or choose **Import anyway** to replace it without a safety copy.
- If the app showed the read-only warning because your saved universe was unreadable, a successful import replaces it and ends read-only mode. The unreadable data is kept in the safety copy.
