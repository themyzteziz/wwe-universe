export default function RosterTable({
  wrestlers,
  dispatch,
}) {
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
                key={wrestler.id}
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
                        dispatch({
                          type: "changeWins",
                          id: wrestler.id,
                          amount: -1,
                        })
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
                        dispatch({
                          type: "changeWins",
                          id: wrestler.id,
                          amount: 1,
                        })
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
        : wrestler.status === "title-shot"
        ? "title-shot"
        : "available"
    }`}
  >
    {wrestler.status === "used"
      ? "Title Shot Used"
      : wrestler.status === "title-shot"
      ? "Title Shot"
      : "Available"}
  </span>
</td>

                <td>
                  <button
                    className={`champion-button ${
                      wrestler.champion ? "active" : ""
                    }`}
                    onClick={() =>
                      dispatch({
                        type: "toggleChampion",
                        id: wrestler.id,
                      })
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
                      dispatch({
                        type: "cycleStatus",
                        id: wrestler.id,
                      })
                    }
                  >
                    Change Status
                  </button>
                </td>

                <td>
                  {wrestler.notes === "WILL RETURN"
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
