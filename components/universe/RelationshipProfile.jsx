import { useState } from "react";
import { useUniverse } from "../../universe/UniverseContext.jsx";
import { NAME_MAX } from "../../universe/factions.js";
import { listFor, nameOf } from "../../universe/relationships.js";

const SECTIONS = [
  { state: "ally", title: "Allies", label: "Ally" },
  { state: "rival", title: "Rivals", label: "Rival" },
  { state: "enemy", title: "Enemies", label: "Enemy" },
  { state: "neutral", title: "Neutral", label: "Neutral" },
];

function StateBadge({ state }) {
  const section = SECTIONS.find((s) => s.state === state) ?? SECTIONS[3];

  return <span className={`badge badge-${section.state}`}>{section.label}</span>;
}

function signed(delta) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function linkLabel(entry) {
  if (entry.eventId !== undefined) return `Event ${entry.eventId}`;
  if (entry.matchId !== undefined) return `Match ${entry.matchId}`;
  return null;
}

function byWeek(history) {
  return history
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.week - b.entry.week || a.index - b.index)
    .map(({ entry }) => entry);
}

export default function RelationshipProfile({ wrestlerId }) {
  const { universe, dispatch } = useUniverse();
  const [open, setOpen] = useState(() => new Set());

  const wrestler = universe.wrestlers.find((w) => w.id === wrestlerId);

  if (!wrestler) return <p className="profile-empty">No wrestlers yet</p>;

  const faction = universe.factions.find((f) => f.active && f.memberIds.includes(wrestlerId));

  function renameFaction() {
    const answer = window.prompt("New faction name", faction.name);

    if (answer === null) return;

    const name = answer.trim();

    if (!name || name.length > NAME_MAX) {
      alert(`A faction name must be 1 to ${NAME_MAX} characters.`);
      return;
    }

    dispatch({ type: "renameFaction", factionId: faction.id, name });
  }

  const rows = listFor(universe, wrestlerId)
    .filter((r) => r.state !== "neutral" || r.history.length > 0)
    .map((r) => ({ ...r, counterpart: nameOf(universe, r.toId) }));

  const toggle = (key) =>
    setOpen((current) => {
      const next = new Set(current);

      if (!next.delete(key)) next.add(key);

      return next;
    });

  return (
    <section className="relationship-profile" aria-label={`${wrestler.name} profile`}>
      <h2>{wrestler.name}</h2>

      {faction && (
        <p className="faction-badge">
          <span title="Faction">{faction.name}</span>{" "}
          <button
            type="button"
            aria-label={`Rename faction ${faction.name}`}
            onClick={renameFaction}
          >
            Rename
          </button>
        </p>
      )}

      {rows.length === 0 && <p className="profile-empty">No history yet</p>}

      {SECTIONS.map(({ state, title }) => {
        const group = rows
          .filter((r) => r.state === state)
          .sort(
            (a, b) =>
              Math.abs(b.score) - Math.abs(a.score) ||
              a.counterpart.name.localeCompare(b.counterpart.name)
          );

        if (group.length === 0) return null;

        return (
          <div key={state} className="profile-section">
            <h3>{title}</h3>

            <ul className="profile-list">
              {group.map((r) => {
                const key = `${r.fromId}>${r.toId}`;
                const isOpen = open.has(key);
                const name = r.counterpart.former
                  ? `${r.counterpart.name} (former)`
                  : r.counterpart.name;

                return (
                  <li key={key} className="profile-row">
                    <button
                      type="button"
                      className="profile-row-button"
                      aria-expanded={isOpen}
                      aria-controls={`history-${key}`}
                      onClick={() => toggle(key)}
                    >
                      <span className="profile-name">{name}</span>
                      <span className="profile-score">{signed(r.score)}</span>
                      <StateBadge state={r.state} />
                    </button>

                    {isOpen && (
                      <ol id={`history-${key}`} className="profile-history">
                        {byWeek(r.history).map((entry) => {
                          const link = linkLabel(entry);

                          return (
                            <li key={entry.id}>
                              <span>Week {entry.week}</span>{" "}
                              <strong>{signed(entry.delta)}</strong>{" "}
                              <span>{entry.reason}</span>
                              {link && <span className="profile-link"> ({link})</span>}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="profile-notes">
        <h3>Notes</h3>
        <p>{wrestler.notes?.trim() ? wrestler.notes : "No notes"}</p>
      </div>
    </section>
  );
}
