// Render helper for the continuity acceptance tests (US-130); storage stubs are in helpers.js.
import { render } from "@testing-library/react";
import App from "../App.jsx";
import { UniverseProvider } from "../universe/UniverseContext.jsx";

export function renderApp() {
  return render(
    <UniverseProvider>
      <App />
    </UniverseProvider>
  );
}
