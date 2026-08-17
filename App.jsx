import { useEffect, useState } from "react";
import Header from "./components/Header";
import WeekInfo from "./components/WeekInfo";
import MatchGenerator from "./components/MatchGenerator";
import RosterTable from "./components/RosterTable";
import WrestlersManager from "./components/WrestlersManager";
import wrestlersData from "./data/wrestlers.json";

function createInitialRoster() {
  return wrestlersData.map((wrestler) => ({
    ...wrestler,
    status: wrestler.note === "*" ? "used" : "available",
    champion: false,
  }));
}

function loadRoster() {
  const savedRoster = localStorage.getItem("wrestlers");

  if (!savedRoster) {
    return createInitialRoster();
  }

  try {
    const parsedRoster = JSON.parse(savedRoster);

    return parsedRoster.map((wrestler) => ({
      ...wrestler,
      status: wrestler.status ?? "available",
      champion: wrestler.champion ?? false,
    }));
  } catch {
    return createInitialRoster();
  }
}

function loadCurrentWeek() {
  const savedWeek = localStorage.getItem("currentWeek");
  return savedWeek ? Number(savedWeek) : 1;
}

export default function App() {
  const [currentWeek, setCurrentWeek] = useState(loadCurrentWeek);
  const [wrestlers, setWrestlers] = useState(loadRoster);
  const [page, setPage] = useState("booking");

  useEffect(() => {
    localStorage.setItem("currentWeek", currentWeek);
  }, [currentWeek]);

  useEffect(() => {
    localStorage.setItem("wrestlers", JSON.stringify(wrestlers));
  }, [wrestlers]);

return (
  <>
    <Header />

    <nav className="main-nav">
      <button
        className={page === "booking" ? "active" : ""}
        onClick={() => setPage("booking")}
      >
        BOOKING
      </button>

      <button
        className={page === "wrestlers" ? "active" : ""}
        onClick={() => setPage("wrestlers")}
      >
        WRESTLERS
      </button>
    </nav>

    {page === "booking" ? (
      <>
        <WeekInfo
          currentWeek={currentWeek}
          setCurrentWeek={setCurrentWeek}
        />

        <MatchGenerator
          currentWeek={currentWeek}
          wrestlers={wrestlers}
        />

        <RosterTable
          wrestlers={wrestlers}
          setWrestlers={setWrestlers}
        />
      </>
    ) : (
      <WrestlersManager
        wrestlers={wrestlers}
        setWrestlers={setWrestlers}
      />
    )}
  </>
);
}
