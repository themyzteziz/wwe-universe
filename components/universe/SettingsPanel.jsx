import { useState } from "react";
import { useUniverse } from "../../universe/UniverseContext";

const SLIDERS = [
  {
    key: "eventFrequency",
    label: "Event frequency",
    help: "How often a result triggers an event proposal; 0 means never.",
  },
  {
    key: "chaos",
    label: "Chaos",
    help: "Higher values make unexpected and rarer events more likely.",
  },
  {
    key: "historySensitivity",
    label: "History sensitivity",
    help: "How strongly past relationships and storylines influence which events happen.",
  },
];

const SEED_ERROR = "Seed must be a whole number 0 or higher, or blank";

/** @returns {{ok: true, value: number|null} | {ok: false}} */
function parseSeed(text) {
  const trimmed = text.trim();

  if (trimmed === "") return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false };

  const value = Number(trimmed);

  return Number.isSafeInteger(value) ? { ok: true, value } : { ok: false };
}

export default function SettingsPanel() {
  const { universe, dispatch, readOnly } = useUniverse();
  const { settings } = universe;
  const [seedText, setSeedText] = useState(
    settings.seed === null ? "" : String(settings.seed)
  );
  const [seedError, setSeedError] = useState(false);

  const update = (partial) => dispatch({ type: "updateSettings", settings: partial });

  const changeSeed = (text) => {
    setSeedText(text);

    const parsed = parseSeed(text);

    setSeedError(!parsed.ok);
    if (parsed.ok) update({ seed: parsed.value });
  };

  const reset = () => {
    dispatch({ type: "resetSettings" });
    setSeedText("");
    setSeedError(false);
  };

  return (
    <form className="settings-panel" onSubmit={(event) => event.preventDefault()}>
      <fieldset disabled={readOnly}>
        <legend>Simulation settings</legend>

        {SLIDERS.map(({ key, label, help }) => (
          <div className="settings-field" key={key}>
            <label htmlFor={`setting-${key}`}>{label}</label>
            <input
              id={`setting-${key}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={settings[key]}
              aria-valuetext={`${settings[key]} out of 100`}
              aria-describedby={`setting-${key}-help`}
              onChange={(event) => update({ [key]: Number(event.target.value) })}
            />
            <output htmlFor={`setting-${key}`}>{settings[key]}</output>
            <p id={`setting-${key}-help`} className="settings-help">
              {help}
            </p>
          </div>
        ))}

        <div className="settings-field">
          <input
            id="setting-autoPropose"
            type="checkbox"
            checked={settings.autoPropose}
            aria-describedby="setting-autoPropose-help"
            onChange={(event) => update({ autoPropose: event.target.checked })}
          />
          <label htmlFor="setting-autoPropose">Auto-propose after each result</label>
          <p id="setting-autoPropose-help" className="settings-help">
            Roll for an event automatically after each recorded result.
          </p>
        </div>

        <div className="settings-field">
          <label htmlFor="setting-seed">Fixed seed</label>
          <input
            id="setting-seed"
            type="text"
            inputMode="numeric"
            value={seedText}
            aria-invalid={seedError}
            aria-describedby="setting-seed-help"
            onChange={(event) => changeSeed(event.target.value)}
          />
          <p id="setting-seed-help" className="settings-help">
            Fixed seed for reproducible rolls (debugging); leave blank for automatic.
          </p>
          {seedError ? <p role="alert">{SEED_ERROR}</p> : null}
        </div>

        <button type="button" onClick={reset}>
          Reset to defaults
        </button>
      </fieldset>
    </form>
  );
}
