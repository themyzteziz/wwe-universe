import { useState } from "react";
import Header from "./components/Header";
import WeekInfo from "./components/WeekInfo";
import MatchGenerator from "./components/MatchGenerator";
import RosterTable from "./components/RosterTable";
import WrestlersManager from "./components/WrestlersManager";
import UniverseView from "./components/universe/UniverseView";
import { useUniverse } from "./universe/UniverseContext.jsx";

export default function App() {
  const { universe, dispatch, banners, dismissBanner } = useUniverse();
  const [page, setPage] = useState("booking");
  const pending = universe.events.filter(
    (event) => event.state === "proposed"
  ).length;

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

        <button
          className={page === "universe" ? "active" : ""}
          onClick={() => setPage("universe")}
        >
          UNIVERSE
          {pending > 0 && (
            <span className="nav-badge" aria-label="pending proposals">
              {pending}
            </span>
          )}
        </button>
      </nav>

      {page === "booking" && (
        <>
          <WeekInfo currentWeek={universe.week} dispatch={dispatch} />

          <MatchGenerator
            currentWeek={universe.week}
            wrestlers={universe.wrestlers}
          />

          <RosterTable wrestlers={universe.wrestlers} dispatch={dispatch} />
        </>
      )}

      {page === "wrestlers" && (
        <WrestlersManager wrestlers={universe.wrestlers} dispatch={dispatch} />
      )}

      {page === "universe" && <UniverseView />}
    </>
  );
}
