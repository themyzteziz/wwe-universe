import { useMemo, useState } from "react";
import { EVENT_TYPE_NAMES } from "../../universe/constants.js";
import { timelineEntries } from "../../universe/selectors.js";
import { useUniverse } from "../../universe/UniverseContext.jsx";

export const PAGE_SIZE = 50;

function parseWeek(text) {
  if (text === "") return { value: undefined };

  const value = Number(text);

  return Number.isInteger(value) && value >= 1 ? { value } : { invalid: true };
}

export default function Timeline() {
  const { universe } = useUniverse();
  const [order, setOrder] = useState("desc");
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo, setWeekTo] = useState("");
  const [wrestlerId, setWrestlerId] = useState("");
  const [eventType, setEventType] = useState("");
  const [showRejected, setShowRejected] = useState(false);
  const [page, setPage] = useState(1);

  const from = parseWeek(weekFrom);
  const to = parseWeek(weekTo);
  let weekError = null;

  if (from.invalid || to.invalid) {
    weekError = "Enter whole weeks of 1 or more.";
  } else if (from.value !== undefined && to.value !== undefined && from.value > to.value) {
    weekError = "The first week must not be after the last week.";
  }

  // An invalid week range is ignored instead of filtering.
  const rangeFrom = weekError ? undefined : from.value;
  const rangeTo = weekError ? undefined : to.value;
  const filtered = rangeFrom !== undefined || rangeTo !== undefined || wrestlerId || eventType;

  const entries = useMemo(
    () =>
      timelineEntries(universe, {
        order,
        weekFrom: rangeFrom,
        weekTo: rangeTo,
        wrestlerId: wrestlerId || undefined,
        eventType: eventType || undefined,
        showRejected,
      }),
    [universe, order, rangeFrom, rangeTo, wrestlerId, eventType, showRejected]
  );

  const wrestlers = useMemo(
    () => [...universe.wrestlers].sort((a, b) => a.name.localeCompare(b.name)),
    [universe.wrestlers]
  );

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = entries.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Any filter change goes back to the first page.
  const change = (setter) => (event) => {
    setter(event.target.type === "checkbox" ? event.target.checked : event.target.value);
    setPage(1);
  };

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="timeline-filters">
        <label>
          From week
          <input type="number" min="1" value={weekFrom} onChange={change(setWeekFrom)} />
        </label>

        <label>
          To week
          <input type="number" min="1" value={weekTo} onChange={change(setWeekTo)} />
        </label>

        <label>
          Wrestler
          <select value={wrestlerId} onChange={change(setWrestlerId)}>
            <option value="">All wrestlers</option>
            {wrestlers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Event type
          <select value={eventType} onChange={change(setEventType)}>
            <option value="">All entries</option>
            {EVENT_TYPE_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="timeline-checkbox">
          <input type="checkbox" checked={showRejected} onChange={change(setShowRejected)} />
          Show rejected
        </label>

        <button
          type="button"
          onClick={() => {
            setOrder(order === "desc" ? "asc" : "desc");
            setPage(1);
          }}
        >
          {order === "desc" ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {weekError && (
        <p className="timeline-error" role="alert">
          {weekError}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="timeline-empty">
          {filtered ? "No entries match these filters" : "Nothing has happened yet"}
        </p>
      ) : (
        <>
          <ol className="timeline-list">
            {visible.map((entry) => (
              <li
                key={`${entry.kind}-${entry.id}`}
                className={`timeline-entry${entry.dimmed ? " dimmed" : ""}`}
              >
                <span className="timeline-week">Week {entry.week}</span>{" "}
                <span className="badge badge-neutral">
                  {entry.kind === "match" ? `Match ${entry.type}` : entry.type}
                </span>{" "}
                {entry.dimmed && <span className="timeline-rejected">Rejected</span>}{" "}
                <span className="timeline-description">{entry.description}</span>
              </li>
            ))}
          </ol>

          <div className="timeline-pager">
            <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              Prev
            </button>

            <span>
              Page {current} of {pageCount}
            </span>

            <button
              type="button"
              disabled={current >= pageCount}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
