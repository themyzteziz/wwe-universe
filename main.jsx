import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { UniverseProvider } from "./universe/UniverseContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UniverseProvider>
      <App />
    </UniverseProvider>
  </React.StrictMode>
);
