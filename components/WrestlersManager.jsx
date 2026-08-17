import { useState } from "react";

export default function WrestlersManager({
  wrestlers,
  setWrestlers,
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

    setWrestlers((current) => [
      ...current,
      {
        name,
        wins: 0,
        note: "",
        status: "available",
        champion: false,
      },
    ]);

    setNewName("");
  }

  function removeWrestler(name) {
    const confirmed = window.confirm(
      `Remove ${name} from the roster?`
    );

    if (!confirmed) return;

    setWrestlers((current) =>
      current.filter((wrestler) => wrestler.name !== name)
    );
  }

  function changeNote(name, note) {
    setWrestlers((current) =>
      current.map((wrestler) =>
        wrestler.name === name
          ? { ...wrestler, note }
          : wrestler
      )
    );
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
        {sortedWrestlers.map((wrestler) => (
          <div
            className="wrestler-manager-card"
            key={wrestler.name}
          >
            <div className="wrestler-manager-header">
              <strong>{wrestler.name}</strong>

              <button
                className="remove-wrestler-button"
                onClick={() =>
                  removeWrestler(wrestler.name)
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
                value={wrestler.note || ""}
                onChange={(event) =>
                  changeNote(
                    wrestler.name,
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}