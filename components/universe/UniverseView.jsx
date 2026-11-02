import { useState } from "react";
import BackupPanel from "./BackupPanel.jsx";
import Timeline from "./Timeline.jsx";

export const SUB_TABS = ["Timeline", "Relationships", "Settings", "Backup"];

function renderPanel(subTab) {
  if (subTab === "Timeline") return <Timeline />;
  if (subTab === "Backup") return <BackupPanel />;

  return <p className="universe-placeholder">{subTab} is coming soon.</p>;
}

export default function UniverseView() {
  const [subTab, setSubTab] = useState("Timeline");

  return (
    <section className="universe-view">
      <div className="universe-subtabs" role="tablist" aria-label="Universe sections">
        {SUB_TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`universe-tab-${name}`}
            aria-selected={subTab === name}
            aria-controls="universe-panel"
            className={subTab === name ? "active" : ""}
            onClick={() => setSubTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div
        className="universe-panel"
        id="universe-panel"
        role="tabpanel"
        aria-labelledby={`universe-tab-${subTab}`}
      >
        {renderPanel(subTab)}
      </div>
    </section>
  );
}
