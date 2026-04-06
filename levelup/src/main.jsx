import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { ThemeProvider } from "./theme/ThemeProvider.jsx";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

if (
  typeof window !== "undefined" &&
  !window.location.hash &&
  window.location.pathname !== "/"
) {
  const normalizedPath = window.location.pathname.startsWith("/")
    ? window.location.pathname
    : `/${window.location.pathname}`;
  const nextUrl = `${window.location.origin}/#${normalizedPath}${window.location.search}`;
  window.location.replace(nextUrl);
}

createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
);
