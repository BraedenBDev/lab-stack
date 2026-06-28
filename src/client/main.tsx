import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/client/App";
import { ErrorBoundary } from "@/client/components/ErrorBoundary";
import "@/client/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
