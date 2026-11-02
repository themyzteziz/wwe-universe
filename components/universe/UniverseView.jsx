import { useState } from "react";
import SettingsPanel from "./SettingsPanel.jsx";
import Timeline from "./Timeline.jsx";

export const SUB_TABS = ["Timeline", "Relationships", "Settings", "Backup"];

function Panel({ name }) {
  if (name === "Timeline") return <Timeline />;
  if (name === "Settings") return <SettingsPanel />;

  return <p className="universe-placeholder">{name} is coming soon.</p>;
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
        <Panel name={subTab} />
      </div>
    </section>
  );
}
