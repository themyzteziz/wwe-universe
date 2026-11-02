import { useState } from "react";
import { validateSettings } from "../../universe/constants.js";
import { useUniverse } from "../../universe/UniverseContext.jsx";

export const COST_WARNING = "Calls to your endpoint may incur cost.";
export const ENDPOINT_ERROR = "Endpoint must start with https://";

function endpointError(text) {
  return text !== "" && !validateSettings({ aiEndpoint: text }).ok;
}

export default function SettingsPanel() {
  const { universe, dispatch, readOnly } = useUniverse();
  const { aiEnabled, aiEndpoint } = universe.settings;
  const [draft, setDraft] = useState(aiEndpoint);
  const invalid = endpointError(draft);

  const changeEndpoint = (event) => {
    const text = event.target.value.trim();

    setDraft(text);

    // Only a valid (or empty) endpoint reaches the universe; the reducer checks again.
    if (!endpointError(text)) {
      dispatch({ type: "updateSettings", settings: { aiEndpoint: text } });
    }
  };

  return (
    <section className="settings-panel" aria-label="AI descriptions">
      <h3>AI descriptions (optional)</h3>

      <label>
        <input
          type="checkbox"
          checked={aiEnabled}
          disabled={readOnly}
          onChange={(event) =>
            dispatch({ type: "updateSettings", settings: { aiEnabled: event.target.checked } })
          }
        />
        Use AI to write event descriptions
      </label>

      {aiEnabled && (
        <p className="settings-warning" role="note">
          {COST_WARNING}
        </p>
      )}

      <label>
        Endpoint URL
        <input
          type="url"
          value={draft}
          disabled={readOnly}
          placeholder="https://your-backend.example/describe"
          aria-invalid={invalid}
          onChange={changeEndpoint}
        />
      </label>

      {invalid && (
        <p className="settings-error" role="alert">
          {ENDPOINT_ERROR}
        </p>
      )}

      <p className="settings-help">
        Off by default. Only event type, names and history facts are sent. No API key is stored in
        this app, and the text never changes relationship effects.
      </p>
    </section>
  );
}
