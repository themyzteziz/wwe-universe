import { useState } from "react";
import Header from "./components/Header";
import WeekInfo from "./components/WeekInfo";
import MatchGenerator from "./components/MatchGenerator";
import RosterTable from "./components/RosterTable";
import WrestlersManager from "./components/WrestlersManager";
import BackupPanel from "./components/universe/BackupPanel";
import RelationshipProfile from "./components/universe/RelationshipProfile";
import WrestlerPicker from "./components/universe/WrestlerPicker";
import { useUniverse } from "./universe/UniverseContext.jsx";

export default function App() {
  const { universe, dispatch, readOnly, banners, dismissBanner } = useUniverse();
  const [page, setPage] = useState("booking");
  const [profileId, setProfileId] = useState(null);

  const selectedId = universe.wrestlers.some((w) => w.id === profileId)
    ? profileId
    : universe.wrestlers.reduce(
        (first, w) => (!first || w.name.localeCompare(first.name) < 0 ? w : first),
        null
      )?.id;

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
          className={page === "profiles" ? "active" : ""}
          onClick={() => setPage("profiles")}
        >
          PROFILES
        </button>
      </nav>

      {page === "booking" && (
        <>
          <WeekInfo currentWeek={universe.week} dispatch={dispatch} />

          <MatchGenerator
            currentWeek={universe.week}
            wrestlers={universe.wrestlers}
            matchResults={universe.matchResults}
            onRecord={
              readOnly
                ? undefined
                : (result) => dispatch({ type: "recordResult", result })
            }
            onUndo={
              readOnly ? undefined : () => dispatch({ type: "undoLastResult" })
            }
          />

          <RosterTable wrestlers={universe.wrestlers} dispatch={dispatch} />
        </>
      )}

      {page === "wrestlers" && (
        <>
          <WrestlersManager wrestlers={universe.wrestlers} dispatch={dispatch} />

          <BackupPanel />
        </>
      )}

      {page === "profiles" && (
        <div className="profiles-page">
          {selectedId && (
            <WrestlerPicker
              wrestlers={universe.wrestlers}
              value={selectedId}
              onChange={setProfileId}
            />
          )}

          <RelationshipProfile wrestlerId={selectedId} />
        </div>
      )}
    </>
  );
}
