import { useEffect, useState } from "react";

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

export default function MatchGenerator({
  currentWeek,
  wrestlers,
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
      title: "Normal Match",
      type: currentMatchType,
      participants,
      playerName: participants[Math.floor(Math.random() * participants.length)].name,
    });
  }

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
                    key={wrestler.name}
                  >
                    {wrestler.name}
                    <span
                      className={`player-select-button${generatedMatch.playerName === wrestler.name ? " selected" : ""}`}
                    >
                      {generatedMatch.playerName === wrestler.name ? "PLAYER" : "CPU"}
                    </span>

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
          </div>
        )}
    </section>
  );
}