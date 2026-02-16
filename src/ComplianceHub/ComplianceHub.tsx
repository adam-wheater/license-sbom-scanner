import * as SDK from "azure-devops-extension-sdk";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../components/App";
import { ThemeProvider } from "../utils/theme";

SDK.init()
  .then(() => SDK.ready())
  .then(() => {
    const container = document.getElementById("root");
    if (container) {
      const root = createRoot(container);
      root.render(
        <ThemeProvider>
          <App />
        </ThemeProvider>
      );
    }
  })
  .catch((err) => {
    console.error("Failed to initialize Azure DevOps SDK:", err);
    const container = document.getElementById("root");
    if (container) {
      container.textContent = "Failed to initialize extension. Please refresh the page.";
    }
  });
