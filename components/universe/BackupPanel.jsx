import { useState } from "react";
import {
  applyImport,
  exportFilename,
  FILE_TOO_LARGE,
  MAX_IMPORT_BYTES,
  parseImport,
  serializeUniverse,
} from "../../universe/exportImport.js";
import { V2_KEY } from "../../universe/schema.js";
import { getStorage, useUniverse } from "../../universe/UniverseContext.jsx";

export const MAX_SHOWN_ERRORS = 20;

const READ_ONLY_EXPORT_NOTICE =
  "Your saved universe could not be read, so the stored file was exported as it is.";

function readText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

const count = (universe) => `${universe.wrestlers.length} wrestlers, ${universe.events.length} events`;

export default function BackupPanel() {
  const { universe, dispatch, readOnly, flushSave, pushBanner } = useUniverse();
  const [errors, setErrors] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [needsSecondConfirm, setNeedsSecondConfirm] = useState(false);
  const [done, setDone] = useState("");

  function exportUniverse() {
    try {
      if (readOnly) {
        const raw = getStorage().getItem(V2_KEY);
        if (raw === null) throw new Error("Nothing stored");
        download(exportFilename(), raw);
        pushBanner({ id: "export", kind: "info", text: READ_ONLY_EXPORT_NOTICE });
      } else {
        const { filename, text } = serializeUniverse(universe);
        download(filename, text);
      }
    } catch {
      pushBanner({ id: "export", kind: "warning", text: "Export failed – try again" });
    }
  }

  async function chooseFile(event) {
    const input = event.target;
    const file = input.files?.[0];
    setDone("");
    setErrors([]);
    setIncoming(null);
    setNeedsSecondConfirm(false);

    if (!file) return;

    let result;
    try {
      result =
        file.size > MAX_IMPORT_BYTES
          ? { errors: [FILE_TOO_LARGE] }
          : parseImport(await readText(file));
    } catch {
      result = { errors: ["The file could not be read. Choose it again."] };
    } finally {
      input.value = "";
    }

    if (result.errors) setErrors(result.errors);
    else setIncoming(result);
  }

  function cancel() {
    setIncoming(null);
    setNeedsSecondConfirm(false);
  }

  function replace() {
    dispatch({ type: "replaceUniverse", universe: incoming.universe, confirmed: true });
    setDone(`Universe replaced (${count(incoming.universe)}).`);
    cancel();
  }

  function confirmReplace() {
    const snapshot = applyImport(getStorage(), readOnly ? null : flushSave);

    if (snapshot.ok) replace();
    else setNeedsSecondConfirm(true);
  }

  const shownErrors = errors.slice(0, MAX_SHOWN_ERRORS);
  const hidden = errors.length - shownErrors.length;

  return (
    <section className="backup-panel" aria-label="Backup">
      <h3>Export</h3>
      <p>Download your whole universe as a JSON file.</p>
      <button type="button" onClick={exportUniverse}>
        Export
      </button>

      <h3>Import</h3>
      <p>
        Restore a universe from a backup file. Your current universe is replaced only after you
        confirm, and a safety copy is kept first.
      </p>
      <label>
        Backup file
        <input type="file" accept=".json,application/json" onChange={chooseFile} />
      </label>

      {done && <p role="status">{done}</p>}

      {shownErrors.length > 0 && (
        <div role="alert" className="backup-errors">
          <p>This file cannot be imported. Your current universe was not changed.</p>
          <ul>
            {shownErrors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
            {hidden > 0 && <li>and {hidden} more</li>}
          </ul>
        </div>
      )}

      {incoming && !needsSecondConfirm && (
        <div role="alertdialog" aria-label="Confirm import">
          <p>
            {readOnly
              ? `Replace the unreadable saved universe with file (${count(incoming.universe)})?`
              : `Replace current universe (${count(universe)}) with file (${count(incoming.universe)})?`}
          </p>
          {incoming.notice && <p>{incoming.notice}</p>}
          <button type="button" onClick={confirmReplace}>
            Replace universe
          </button>
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}

      {incoming && needsSecondConfirm && (
        <div role="alertdialog" aria-label="No safety copy">
          <p>
            No safety copy of your current universe could be kept because browser storage is full.
            Export your universe first if you want to keep it. Import anyway?
          </p>
          <button type="button" onClick={replace}>
            Import anyway
          </button>
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
