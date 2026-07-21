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
        wrestler.status === "available" &&
        wrestler.note !== "WILL RETURN" &&
        !wrestler.champion
    );

    const champions = wrestlers.filter(
      (wrestler) =>
        wrestler.champion &&
        wrestler.note !== "WILL RETURN"
    );

    if (currentMatchType === "1v1") {
      generateOneVsOne(eligibleWrestlers, champions);
      return;
    }

    if (currentMatchType === "3MAN ELI") {
      generateThreeMan(eligibleWrestlers, champions);
      return;
    }

    generateFourMan(eligibleWrestlers);
  }

  function generateOneVsOne(
    eligibleWrestlers,
    champions
  ) {
    const worldTitleCandidates = eligibleWrestlers
      .filter(
        (wrestler) =>
          wrestler.wins > 0 &&
          wrestler.wins % 3 === 0
      )
      .sort((a, b) => b.wins - a.wins);

    if (
      worldTitleCandidates.length > 0 &&
      champions.length > 0
    ) {
      const challenger = worldTitleCandidates[0];
      const champion =
        champions[
          Math.floor(Math.random() * champions.length)
        ];

      setGeneratedMatch({
        title: "World Title Match",
        type: "1v1",
        participants: [challenger, champion],
        reason: `${challenger.name} earned a World Title Shot with ${challenger.wins} wins.`,
      });

      return;
    }

    const participants = getRandomWrestlers(
      eligibleWrestlers,
      2
    );

    if (participants.length < 2) {
      setGeneratedMatch({
        error:
          "Not enough available wrestlers to generate a 1v1 match.",
      });
      return;
    }

    setGeneratedMatch({
      title: "Normal Match",
      type: "1v1",
      participants,
    });
  }

  function generateThreeMan(
    eligibleWrestlers,
    champions
  ) {
    const singlesTitleCandidates = eligibleWrestlers
      .filter(
        (wrestler) =>
          wrestler.wins > 0 &&
          wrestler.wins % 2 === 0
      )
      .sort((a, b) => b.wins - a.wins);

    if (
      singlesTitleCandidates.length > 0 &&
      champions.length > 0
    ) {
      const challenger = singlesTitleCandidates[0];
      const champion =
        champions[
          Math.floor(Math.random() * champions.length)
        ];

      const remainingWrestlers =
        eligibleWrestlers.filter(
          (wrestler) =>
            wrestler.name !== challenger.name
        );

      const extraParticipant =
        getRandomWrestlers(remainingWrestlers, 1)[0];

      if (!extraParticipant) {
        setGeneratedMatch({
          error:
            "Not enough available wrestlers to generate a 3-man title match.",
        });
        return;
      }

      setGeneratedMatch({
        title: "Singles Title Match",
        type: "3MAN ELI",
        participants: [
          challenger,
          champion,
          extraParticipant,
        ],
        reason: `${challenger.name} earned a Singles Title Shot with ${challenger.wins} wins.`,
      });

      return;
    }

    const participants = getRandomWrestlers(
      eligibleWrestlers,
      3
    );

    if (participants.length < 3) {
      setGeneratedMatch({
        error:
          "Not enough available wrestlers to generate a 3-man elimination match.",
      });
      return;
    }

    setGeneratedMatch({
      title: "Normal Match",
      type: "3MAN ELI",
      participants,
    });
  }

  function generateFourMan(eligibleWrestlers) {
    const participants = getRandomWrestlers(
      eligibleWrestlers,
      4
    );

    if (participants.length < 4) {
      setGeneratedMatch({
        error:
          "Not enough available wrestlers to generate a 4-man elimination match.",
      });
      return;
    }

    setGeneratedMatch({
      title: "Normal Match",
      type: "4MAN ELI",
      participants,
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
                    {wrestler.champion && (
                      <span>👑 </span>
                    )}

                    {wrestler.name}

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

            {generatedMatch.reason && (
              <p className="match-reason">
                {generatedMatch.reason}
              </p>
            )}
          </div>
        )}
    </section>
  );
}