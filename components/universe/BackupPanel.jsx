import { exportFilename, serializeUniverse } from "../../universe/exportImport.js";
import { V2_KEY } from "../../universe/schema.js";
import { useUniverse } from "../../universe/UniverseContext.jsx";

const READ_ONLY_NOTICE =
  "Your saved universe could not be read, so the stored data was exported exactly as it is.";
const EXPORT_FAILED = "Export failed – try again";

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

export default function BackupPanel() {
  const { universe, readOnly, pushBanner, dismissBanner } = useUniverse();

  function handleExport() {
    dismissBanner("exportError");

    try {
      // Read-only mode: the in-memory universe is a placeholder, so export what is stored.
      const raw = readOnly ? window.localStorage.getItem(V2_KEY) : null;

      if (raw !== null) {
        download(exportFilename(), raw);
        pushBanner({ id: "exportNotice", kind: "info", text: READ_ONLY_NOTICE });
        return;
      }

      const { filename, text } = serializeUniverse(universe);
      download(filename, text);
    } catch {
      pushBanner({ id: "exportError", kind: "warning", text: EXPORT_FAILED });
    }
  }

  return (
    <section className="backup-panel">
      <h2>Backup</h2>
      <p>Download your whole universe as a JSON file.</p>
      <button type="button" onClick={handleExport}>
        Export
      </button>
    </section>
  );
}
