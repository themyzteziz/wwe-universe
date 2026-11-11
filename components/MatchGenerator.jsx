import { useEffect, useState } from "react";
import { defaultSeed } from "../universe/sim/rng.js";
import { newId } from "../universe/schema.js";

const weekTypes = ["1v1", "3MAN ELI", "4MAN ELI"];

function shuffle(array) {
  const shuffled = [...array];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function getRandomWrestlers(wrestlers, amount) {
  return shuffle(wrestlers).slice(0, amount);
}

/**
 * `onRecord(payload)` and `onUndo()` dispatch `recordResult` / `undoLastResult`
 * on the Universe store; `matchResults` is `universe.matchResults`. Without
 * `onRecord` the generator works as before and shows no result controls.
 */
export default function MatchGenerator({
  currentWeek,
  wrestlers,
  matchResults = [],
  onRecord,
  onUndo,
}) {
  const [generatedMatch, setGeneratedMatch] =
    useState(null);

  const currentMatchType =
    weekTypes[(currentWeek - 1) % weekTypes.length];

  useEffect(() => {
    setGeneratedMatch(null);
  }, [currentWeek]);

  function generateMatch() {
    const eligibleWrestlers = wrestlers.filter(
      (wrestler) =>
        (wrestler.status === "available" ||
          wrestler.status === "used") &&
        !wrestler.champion
    );

    let amount = 2;

    if (currentMatchType === "3MAN ELI") {
      amount = 3;
    }

    if (currentMatchType === "4MAN ELI") {
      amount = 4;
    }

    const participants = getRandomWrestlers(
      eligibleWrestlers,
      amount
    );

    if (participants.length < amount) {
      setGeneratedMatch({
        error: `Not enough wrestlers to generate a ${currentMatchType} match.`,
      });

      return;
    }

    setGeneratedMatch({
      matchId: newId("m"),
      title: "Normal Match",
      type: currentMatchType,
      participants,
      playerWrestlerId: participants[Math.floor(Math.random() * participants.length)].id,
    });
  }

  function recordWinner(winner) {
    onRecord({
      id: generatedMatch.matchId,
      recordedAt: new Date().toISOString(),
      seed: defaultSeed(),
      week: currentWeek,
      type: generatedMatch.type,
      participantIds: generatedMatch.participants.map(
        (wrestler) => wrestler.id
      ),
      winnerIds: [winner.id],
      ...(generatedMatch.playerWrestlerId ? { playerWrestlerId: generatedMatch.playerWrestlerId } : {}),
    });

    setGeneratedMatch({
      ...generatedMatch,
      recordedWinner: winner.name,
    });
  }

  const lastResult = matchResults.at(-1);
  const lastWinners = lastResult?.winnerIds
    .map(
      (winnerId) =>
        wrestlers.find((wrestler) => wrestler.id === winnerId)
          ?.name ?? "A removed wrestler"
    )
    .join(", ");

  return (
    <section className="match-generator">
      <h2>Match Generator</h2>

      <p>
        <strong>Current Match Type:</strong>{" "}
        {currentMatchType}
      </p>

      <button
        className="generate-match-button"
        onClick={generateMatch}
      >
        {generatedMatch
          ? "Reroll Match"
          : "Generate Match"}
      </button>

      {generatedMatch?.error && (
        <p className="generator-error">
          {generatedMatch.error}
        </p>
      )}

      {generatedMatch &&
        !generatedMatch.error && (
          <div className="generated-match">
            <h3>{generatedMatch.title}</h3>

            <p className="generated-match-type">
              {generatedMatch.type}
            </p>

            <div className="generated-participants">
              {generatedMatch.participants.map(
                (wrestler, index) => (
                  <div
                    className="generated-wrestler"
                    key={wrestler.id}
                  >
                    {wrestler.name}

                    <span
                      className={`player-select-button${generatedMatch.playerWrestlerId === wrestler.id ? " selected" : ""}`}
                    >
                      {generatedMatch.playerWrestlerId === wrestler.id ? "PLAYER" : "CPU"}
                    </span>

                    {onRecord && (
                      <button
                        className="winner-button"
                        onClick={() =>
                          recordWinner(wrestler)
                        }
                        disabled={Boolean(
                          generatedMatch.recordedWinner
                        )}
                        aria-label={`Mark ${wrestler.name} as winner`}
                      >
                        Winner
                      </button>
                    )}

                    {index <
                      generatedMatch.participants.length -
                        1 && (
                      <span className="versus">
                        {" "}
                        VS{" "}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>

            {generatedMatch.recordedWinner && (
              <p className="result-recorded">
                Result recorded:{" "}
                {generatedMatch.recordedWinner}
              </p>
            )}
          </div>
        )}

      {onUndo && lastResult && (
        <div className="undo-result">
          <button onClick={onUndo}>
            Undo last result
          </button>

          <span>
            Week {lastResult.week} {lastResult.type}:{" "}
            {lastWinners} won
          </span>
        </div>
      )}
    </section>
  );
}
