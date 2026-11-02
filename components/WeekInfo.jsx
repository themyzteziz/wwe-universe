const weekTypes = ["1v1", "3MAN ELI", "4MAN ELI"];

export default function WeekInfo({
  currentWeek,
  dispatch,
}) {
  const currentMatchType =
    weekTypes[(currentWeek - 1) % weekTypes.length];

  const nextMatchType =
    weekTypes[currentWeek % weekTypes.length];

  function previousWeek() {
    dispatch({ type: "setWeek", week: Math.max(1, currentWeek - 1) });
  }

  function nextWeek() {
    dispatch({ type: "setWeek", week: currentWeek + 1 });
  }

  return (
    <section className="week-info">
      <h2>Current Week</h2>

      <div className="week-controls">
        <button onClick={previousWeek}>◀ Previous</button>

        <h3>Week {currentWeek}</h3>

        <button onClick={nextWeek}>Next ▶</button>
      </div>

      <p>
        <strong>Match Type:</strong> {currentMatchType}
      </p>

      <p>
        <strong>Next:</strong> {nextMatchType}
      </p>
    </section>
  );
}
