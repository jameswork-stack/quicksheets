import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW, initInstallPrompt } from "./registerSW";

// Initialize the app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker and initialize install prompt in development mode
if (import.meta.env.PROD) {
  registerSW();
  initInstallPrompt();
}
