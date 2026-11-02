import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { DEFAULT_SETTINGS, validateSettings } from "./constants";
import { recordResult, undoLastResult } from "./matchResults";
import { ensureCurrent } from "./migrate";
import { applyDelta, RelationshipError } from "./relationships";
import { V2_KEY, validateUniverse } from "./schema";

export const SAVE_DELAY_MS = 300;

const NEXT_STATUS = {
  available: "title-shot",
  "title-shot": "used",
  used: "available",
};

const STORAGE_WARNING =
  "Changes may not be saved: browser storage is full or unavailable. Keep this tab open and free up space.";

const READ_ONLY_WARNING =
  "Your saved universe could not be read, so changes will not be saved until you replace it.";

const unavailableStorage = {
  getItem: () => null,
  setItem: () => {
    throw new Error("Storage unavailable");
  },
};

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return unavailableStorage;
  }
}

export function saveUniverse(storage, universe) {
  try {
    storage.setItem(V2_KEY, JSON.stringify(universe));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export function loadUniverse(storage) {
  const { universe, notice, readOnly } = ensureCurrent(storage);
  const banners = [];

  if (readOnly) {
    banners.push({ id: "readOnly", kind: "warning", text: READ_ONLY_WARNING });
  }

  if (notice) {
    banners.push({
      id: "notice",
      kind: readOnly ? "warning" : "info",
      text: notice,
    });
  }

  return {
    universe,
    readOnly: Boolean(readOnly),
    notice: notice ?? null,
    saveError: null,
    banners,
  };
}

function updateWrestler(universe, id, change) {
  if (!universe.wrestlers.some((wrestler) => wrestler.id === id)) {
    return universe;
  }

  return {
    ...universe,
    wrestlers: universe.wrestlers.map((wrestler) =>
      wrestler.id === id ? { ...wrestler, ...change(wrestler) } : wrestler
    ),
  };
}

function applyAction(universe, action) {
  switch (action.type) {
    case "addWrestler": {
      const name = String(action.name ?? "").trim().toUpperCase();

      if (!name || !action.id) return universe;

      if (universe.wrestlers.some((wrestler) => wrestler.name.toUpperCase() === name)) {
        return universe;
      }

      return {
        ...universe,
        wrestlers: [
          ...universe.wrestlers,
          {
            id: action.id,
            name,
            wins: 0,
            status: "available",
            champion: false,
            notes: "",
          },
        ],
      };
    }

    case "removeWrestler": {
      const target = universe.wrestlers.find((wrestler) => wrestler.id === action.id);

      if (!target) return universe;

      return {
        ...universe,
        wrestlers: universe.wrestlers.filter((wrestler) => wrestler.id !== action.id),
        formerWrestlers: {
          ...universe.formerWrestlers,
          [target.id]: target.name,
        },
      };
    }

    case "applyRelationshipDelta": {
      // eslint-disable-next-line no-unused-vars
      const { type, ...input } = action;

      try {
        return applyDelta(universe, input);
      } catch (error) {
        if (error instanceof RelationshipError) return universe;
        throw error;
      }
    }

    case "setNotes":
      return updateWrestler(universe, action.id, () => ({
        notes: String(action.notes ?? ""),
      }));

    case "changeWins":
      return updateWrestler(universe, action.id, (wrestler) => ({
        wins: Math.max(0, wrestler.wins + action.amount),
      }));

    case "cycleStatus":
      return updateWrestler(universe, action.id, (wrestler) => ({
        status: NEXT_STATUS[wrestler.status] ?? "available",
      }));

    case "toggleChampion":
      return updateWrestler(universe, action.id, (wrestler) => ({
        champion: !wrestler.champion,
      }));

    case "setWeek":
      return Number.isInteger(action.week) && action.week >= 1
        ? { ...universe, week: action.week }
        : universe;

    // `result` is nested because a match `type` would clash with the action `type`.
    case "recordResult":
      return recordResult(universe, action.result ?? {});

    case "undoLastResult":
      return undoLastResult(universe);

    // `settings` is a partial payload; invalid values leave the state unchanged.
    case "updateSettings": {
      const merged = { ...universe.settings, ...action.settings };

      return validateSettings(merged).ok
        ? { ...universe, settings: merged }
        : universe;
    }

    // Also clears the AI fields (aiEnabled false, aiEndpoint "").
    case "resetSettings":
      return { ...universe, settings: { ...DEFAULT_SETTINGS } };

    default:
      return universe;
  }
}

function withBanner(banners, banner) {
  return [...banners.filter((existing) => existing.id !== banner.id), banner];
}

export function reducer(state, action) {
  switch (action.type) {
    case "pushBanner":
      return { ...state, banners: withBanner(state.banners, action.banner) };

    case "dismissBanner":
      return {
        ...state,
        notice: action.id === "notice" ? null : state.notice,
        banners: state.banners.filter((banner) => banner.id !== action.id),
      };

    case "saveResult":
      if (action.ok) {
        if (!state.saveError) return state;

        return {
          ...state,
          saveError: null,
          banners: state.banners.filter((banner) => banner.id !== "storage"),
        };
      }

      return {
        ...state,
        saveError: STORAGE_WARNING,
        banners: withBanner(state.banners, {
          id: "storage",
          kind: "warning",
          text: STORAGE_WARNING,
        }),
      };

    case "replaceUniverse": {
      if (!action.universe || validateUniverse(action.universe).length > 0) {
        return state;
      }

      const settings = {
        ...validateSettings(action.universe.settings).value,
        aiEnabled: false,
      };

      return {
        ...state,
        universe: { ...action.universe, settings },
        readOnly: action.confirmed === true ? false : state.readOnly,
        banners:
          action.confirmed === true
            ? state.banners.filter((banner) => banner.id !== "readOnly")
            : state.banners,
      };
    }

    default: {
      if (state.readOnly) return state;

      const universe = applyAction(state.universe, action);

      return universe === state.universe ? state : { ...state, universe };
    }
  }
}

const UniverseContext = createContext(null);

export function UniverseProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () =>
    loadUniverse(getStorage())
  );
  const { universe, readOnly } = state;
  const lastSeen = useRef(universe);
  const pending = useRef(null);
  const timer = useRef(null);

  const flushSave = useCallback(() => {
    clearTimeout(timer.current);

    const toSave = pending.current;
    pending.current = null;

    if (!toSave) return;

    dispatch({
      type: "saveResult",
      ok: saveUniverse(getStorage(), toSave).ok,
    });
  }, []);

  useEffect(() => {
    if (universe === lastSeen.current) return;

    lastSeen.current = universe;

    if (readOnly) return;

    pending.current = universe;
    clearTimeout(timer.current);
    timer.current = setTimeout(flushSave, SAVE_DELAY_MS);
  }, [universe, readOnly, flushSave]);

  useEffect(() => {
    window.addEventListener("pagehide", flushSave);

    return () => {
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
  }, [flushSave]);

  const pushBanner = useCallback(
    (banner) => dispatch({ type: "pushBanner", banner }),
    []
  );
  const dismissBanner = useCallback(
    (id) => dispatch({ type: "dismissBanner", id }),
    []
  );
  const dismissNotice = useCallback(() => dismissBanner("notice"), [dismissBanner]);

  const value = useMemo(
    () => ({
      universe,
      dispatch,
      notice: state.notice,
      saveError: state.saveError,
      readOnly,
      banners: state.banners,
      pushBanner,
      dismissBanner,
      flushSave,
      dismissNotice,
    }),
    [universe, readOnly, state.notice, state.saveError, state.banners, pushBanner, dismissBanner, flushSave, dismissNotice]
  );

  return (
    <UniverseContext.Provider value={value}>{children}</UniverseContext.Provider>
  );
}

export function useUniverse() {
  const context = useContext(UniverseContext);

  if (!context) {
    throw new Error("useUniverse must be used inside <UniverseProvider>");
  }

  return context;
}
