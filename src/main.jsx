import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Init Telegram WebApp
try {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    // Match dark theme
    tg.setHeaderColor("#0a0a0f");
    tg.setBackgroundColor("#0a0a0f");
  }
} catch (e) {
  console.warn("Telegram WebApp not available:", e);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
