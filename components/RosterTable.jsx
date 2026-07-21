export default function RosterTable({
  wrestlers,
  setWrestlers,
}) {
  function toggleStatus(name) {
    setWrestlers((currentWrestlers) =>
      currentWrestlers.map((wrestler) =>
        wrestler.name === name
          ? {
              ...wrestler,
              status:
                wrestler.status === "available"
                  ? "used"
                  : "available",
            }
          : wrestler
      )
    );
  }

  function changeWins(name, amount) {
    setWrestlers((currentWrestlers) =>
      currentWrestlers.map((wrestler) =>
        wrestler.name === name
          ? {
              ...wrestler,
              wins: Math.max(0, wrestler.wins + amount),
            }
          : wrestler
      )
    );
  }

  function toggleChampion(name) {
    setWrestlers((currentWrestlers) =>
      currentWrestlers.map((wrestler) =>
        wrestler.name === name
          ? {
              ...wrestler,
              champion: !wrestler.champion,
            }
          : wrestler
      )
    );
  }

  const sortedWrestlers = [...wrestlers].sort(
    (a, b) => b.wins - a.wins
  );

  return (
    <section className="roster-section">
      <h2>Roster</h2>

      <div className="table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Wrestler</th>
              <th>Wins</th>
              <th>Status</th>
              <th>Champion</th>
              <th>Change Status</th>
              <th>Note</th>
            </tr>
          </thead>

          <tbody>
            {sortedWrestlers.map((wrestler) => (
              <tr
                key={wrestler.name}
                className={
                  wrestler.champion ? "champion-row" : ""
                }
              >
                <td className="wrestler-name">
                  {wrestler.champion && (
                    <span className="champion-crown">
                      👑
                    </span>
                  )}

                  {wrestler.name}
                </td>

                <td>
                  <div className="wins-controls">
                    <button
                      className="win-button minus"
                      onClick={() =>
                        changeWins(wrestler.name, -1)
                      }
                      disabled={wrestler.wins === 0}
                      aria-label={`Remove one win from ${wrestler.name}`}
                    >
                      −
                    </button>

                    <span className="wins-number">
                      {wrestler.wins}
                    </span>

                    <button
                      className="win-button plus"
                      onClick={() =>
                        changeWins(wrestler.name, 1)
                      }
                      aria-label={`Add one win to ${wrestler.name}`}
                    >
                      +
                    </button>
                  </div>
                </td>

                <td>
                  <span
                    className={`status ${
                      wrestler.status === "used"
                        ? "used"
                        : "available"
                    }`}
                  >
                    {wrestler.status === "used"
                      ? "Title Shot Used"
                      : "Available"}
                  </span>
                </td>

                <td>
                  <button
                    className={`champion-button ${
                      wrestler.champion ? "active" : ""
                    }`}
                    onClick={() =>
                      toggleChampion(wrestler.name)
                    }
                  >
                    {wrestler.champion
                      ? "Remove Champion"
                      : "Make Champion"}
                  </button>
                </td>

                <td>
                  <button
                    className="status-button"
                    onClick={() =>
                      toggleStatus(wrestler.name)
                    }
                  >
                    Change Status
                  </button>
                </td>

                <td>
                  {wrestler.note === "WILL RETURN"
                    ? "WILL RETURN"
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}