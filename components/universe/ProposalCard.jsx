import { useId, useState } from "react";
import { useUniverse } from "../../universe/UniverseContext.jsx";
import { getRelationship, nameOf, stateOf } from "../../universe/relationships.js";
import { EVENT_TYPES } from "../../universe/sim/config.js";

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function signed(score) {
  if (score > 0) return `+${score}`;
  if (score < 0) return `−${Math.abs(score)}`;
  return "0";
}

const describeScore = (score) => `${capitalise(stateOf(score))} (${signed(score)})`;

function Suggestions({ universe, readOnly, dispatch }) {
  const rows = universe.events
    .filter((event) => event.state === "accepted")
    .flatMap((event, index) =>
      (event.suggestions ?? [])
        .filter((suggestion) => suggestion.state === "pending")
        .map((suggestion) => ({ event, suggestion, index }))
    )
    .sort(
      (a, b) =>
        String(b.event.createdAt ?? "").localeCompare(String(a.event.createdAt ?? "")) ||
        b.index - a.index
    );

  if (rows.length === 0) return null;

  return (
    <section className="proposal-suggestions" role="region" aria-label="Title-shot suggestions">
      <h3>Title-shot suggestions</h3>

      <ul>
        {rows.map(({ event, suggestion }) => {
          const name = nameOf(universe, suggestion.wrestlerId).name;
          const ids = { eventId: event.id, suggestionId: suggestion.id };

          return (
            <li key={suggestion.id} className="proposal-suggestion">
              <p>{suggestion.reason}</p>

              <div className="proposal-actions">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => dispatch({ type: "confirmSuggestion", ...ids })}
                >
                  Confirm title shot for {name}
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => dispatch({ type: "dismissSuggestion", ...ids })}
                >
                  Dismiss
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function ProposalCard() {
  const { universe, dispatch, readOnly, lastRoll } = useUniverse();
  const headingId = useId();
  const [dismissedRoll, setDismissedRoll] = useState(null);
  const [rerolled, setRerolled] = useState(null);

  const event = universe.events.find((candidate) => candidate.state === "proposed");
  const lastMatchId = universe.matchResults.at(-1)?.id ?? "none";
  const showToast = lastRoll === "no-event" && dismissedRoll !== lastMatchId;

  const hasSuggestions = universe.events.some(
    (candidate) =>
      candidate.state === "accepted" &&
      (candidate.suggestions ?? []).some((suggestion) => suggestion.state === "pending")
  );

  if (!event && !showToast && !hasSuggestions) return null;

  const resolve = (type) => dispatch({ type, eventId: event.id });
  const reroll = () => {
    setRerolled({ id: event.id, count: event.rerollCount ?? 0 });
    dispatch({ type: "rerollEvent", eventId: event.id, now: new Date().toISOString() });
  };

  const config = event ? EVENT_TYPES[event.type] : null;
  const label = config?.label ?? event?.type;
  const tier = event?.tier ?? config?.tier ?? "common";
  const noOther =
    rerolled && event && rerolled.id === event.id && rerolled.count === (event.rerollCount ?? 0);
  const pendingSuggestions = (event?.suggestions ?? []).filter(
    (suggestion) => suggestion.state === "pending"
  );

  return (
    <div className="proposal-panel">
      {showToast && (
        <div className="proposal-toast" role="status">
          <span>No event this time</span>

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setDismissedRoll(lastMatchId)}
          >
            ×
          </button>
        </div>
      )}

      {event && (
        <section className="proposal-card" aria-labelledby={headingId}>
          <header className="proposal-card-header">
            <h2 id={headingId}>{label}</h2>
            <span className={`badge proposal-tier proposal-tier-${tier}`}>
              {capitalise(tier)}
            </span>
          </header>

          <p className="proposal-description">{event.description}</p>

          <p className="proposal-affected">
            <strong>Affected wrestlers:</strong>{" "}
            {event.participantIds.map((id) => nameOf(universe, id).name).join(", ")}
          </p>

          <ul className="proposal-deltas">
            {event.deltas.map((delta) => {
              const before = getRelationship(universe, delta.fromId, delta.toId)?.score ?? 0;

              return (
                <li key={`${delta.fromId}>${delta.toId}`}>
                  {nameOf(universe, delta.fromId).name} → {nameOf(universe, delta.toId).name}:{" "}
                  {describeScore(before)} → {describeScore(delta.scoreAfter)}
                </li>
              );
            })}
          </ul>

          {pendingSuggestions.map((suggestion) => (
            <p key={suggestion.id} className="proposal-suggestion-note">
              If accepted, you may confirm a title shot for{" "}
              {nameOf(universe, suggestion.wrestlerId).name}
            </p>
          ))}

          <p className="proposal-notice">Wins, titles and title shots are not affected</p>

          <div className="proposal-actions">
            <button
              type="button"
              aria-label={`Accept ${label} event`}
              disabled={readOnly}
              onClick={() => resolve("acceptEvent")}
            >
              Accept
            </button>

            <button
              type="button"
              aria-label={`Reject ${label} event`}
              disabled={readOnly}
              onClick={() => resolve("rejectEvent")}
            >
              Reject
            </button>

            <button
              type="button"
              aria-label={`Reroll ${label} event`}
              disabled={readOnly}
              onClick={reroll}
            >
              Reroll
            </button>
          </div>

          {noOther && <p role="status">No other event available.</p>}
        </section>
      )}

      <Suggestions universe={universe} readOnly={readOnly} dispatch={dispatch} />
    </div>
  );
}
