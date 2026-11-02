import { useState } from "react";
import Header from "./components/Header";
import WeekInfo from "./components/WeekInfo";
import MatchGenerator from "./components/MatchGenerator";
import RosterTable from "./components/RosterTable";
import WrestlersManager from "./components/WrestlersManager";
import { useUniverse } from "./universe/UniverseContext.jsx";

export default function App() {
  const { universe, dispatch, banners, dismissBanner } = useUniverse();
  const [page, setPage] = useState("booking");

  return (
    <>
      <Header />

      {banners.map((banner) => (
        <div
          key={banner.id}
          className={`banner ${banner.kind}`}
          role={banner.kind === "warning" ? "alert" : "status"}
        >
          <span>{banner.text}</span>

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => dismissBanner(banner.id)}
          >
            ×
          </button>
        </div>
      ))}

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
          <WeekInfo currentWeek={universe.week} dispatch={dispatch} />

          <MatchGenerator
            currentWeek={universe.week}
            wrestlers={universe.wrestlers}
          />

          <RosterTable wrestlers={universe.wrestlers} dispatch={dispatch} />
        </>
      ) : (
        <WrestlersManager
          wrestlers={universe.wrestlers}
          factions={universe.factions}
          dispatch={dispatch}
        />
      )}
    </>
  );
}
