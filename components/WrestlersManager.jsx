import { useState } from "react";
import { NAME_MAX } from "../universe/factions";
import { newId } from "../universe/schema";

export default function WrestlersManager({
  wrestlers,
  factions = [],
  dispatch,
}) {
  const [newName, setNewName] = useState("");

  function addWrestler(event) {
    event.preventDefault();

    const name = newName.trim().toUpperCase();

    if (!name) return;

    const alreadyExists = wrestlers.some(
      (wrestler) => wrestler.name.toUpperCase() === name
    );

    if (alreadyExists) {
      alert("That wrestler already exists.");
      return;
    }

    dispatch({ type: "addWrestler", name, id: newId("w") });

    setNewName("");
  }

  function removeWrestler(wrestler) {
    const confirmed = window.confirm(
      `Remove ${wrestler.name} from the roster?`
    );

    if (!confirmed) return;

    dispatch({ type: "removeWrestler", id: wrestler.id });
  }

  function renameFaction(faction) {
    const answer = window.prompt("New faction name", faction.name);

    if (answer === null) return;

    const name = answer.trim();

    if (!name || name.length > NAME_MAX) {
      alert(`A faction name must be 1 to ${NAME_MAX} characters.`);
      return;
    }

    dispatch({ type: "renameFaction", factionId: faction.id, name });
  }

  const sortedWrestlers = [...wrestlers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <section className="wrestlers-manager">
      <h2>WRESTLERS</h2>

      <form
        className="add-wrestler-form"
        onSubmit={addWrestler}
      >
        <input
          type="text"
          placeholder="Wrestler name"
          value={newName}
          onChange={(event) =>
            setNewName(event.target.value)
          }
        />

        <button type="submit">
          Add Wrestler
        </button>
      </form>

      <div className="wrestlers-list">
        {sortedWrestlers.map((wrestler) => {
          const faction = factions.find(
            (f) => f.active && f.memberIds.includes(wrestler.id)
          );

          return (
            <div
              className="wrestler-manager-card"
              key={wrestler.id}
            >
              <div className="wrestler-manager-header">
                <strong>{wrestler.name}</strong>

                {faction && (
                  <span className="faction-badge">
                    <span title="Faction">{faction.name}</span>
                    <button
                      type="button"
                      aria-label={`Rename faction ${faction.name}`}
                      onClick={() => renameFaction(faction)}
                    >
                      Rename
                    </button>
                  </span>
                )}

                <button
                  className="remove-wrestler-button"
                  onClick={() =>
                    removeWrestler(wrestler)
                  }
                >
                  Remove
                </button>
              </div>

              <label>
                Note
                <input
                  type="text"
                  placeholder="Add a note..."
                  value={wrestler.notes || ""}
                  onChange={(event) =>
                    dispatch({
                      type: "setNotes",
                      id: wrestler.id,
                      notes: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
