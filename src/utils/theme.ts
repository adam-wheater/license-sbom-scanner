import * as React from "react";

export interface ThemeColors {
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textVeryMuted: string;

  bgSurface: string;
  bgSurfaceAlt: string;
  bgProgressTrack: string;

  borderDefault: string;
  borderInput: string;
  borderRow: string;

  errorBg: string;
  errorText: string;
  successBg: string;
  successText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  cleanBg: string;
  cleanBorder: string;

  statGreen: string;
  disabledBg: string;
  btnDefaultBg: string;
  btnCancelBg: string;
}

const lightTheme: ThemeColors = {
  textPrimary: "#333",
  textSecondary: "#666",
  textMuted: "#888",
  textVeryMuted: "#999",

  bgSurface: "#fafafa",
  bgSurfaceAlt: "#f5f5f5",
  bgProgressTrack: "#e0e0e0",

  borderDefault: "#e0e0e0",
  borderInput: "#ccc",
  borderRow: "#eee",

  errorBg: "#ffebee",
  errorText: "#c62828",
  successBg: "#e8f5e9",
  successText: "#2e7d32",
  warningBg: "#fff3e0",
  warningBorder: "#ffe0b2",
  warningText: "#e65100",
  cleanBg: "#e8f5e9",
  cleanBorder: "#c8e6c9",

  statGreen: "#388e3c",
  disabledBg: "#ccc",
  btnDefaultBg: "#f5f5f5",
  btnCancelBg: "#eee",
};

const darkTheme: ThemeColors = {
  textPrimary: "#f5f5f5",
  textSecondary: "#d0d0d0",
  textMuted: "#b0b0b0",
  textVeryMuted: "#999",

  bgSurface: "#2a2a2a",
  bgSurfaceAlt: "#333",
  bgProgressTrack: "#444",

  borderDefault: "#444",
  borderInput: "#555",
  borderRow: "#3a3a3a",

  errorBg: "#4a1c1c",
  errorText: "#ef9a9a",
  successBg: "#1b3a1b",
  successText: "#81c784",
  warningBg: "#3d2e1a",
  warningBorder: "#5a4020",
  warningText: "#ffb74d",
  cleanBg: "#1b3a1b",
  cleanBorder: "#2a4a2a",

  statGreen: "#66bb6a",
  disabledBg: "#555",
  btnDefaultBg: "#3a3a3a",
  btnCancelBg: "#444",
};

function detectDarkMode(): boolean {
  if (document.body.classList.contains("dark-theme")) return true;
  if (document.body.classList.contains("light-theme")) return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

const ThemeContext = React.createContext<ThemeColors>(lightTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = React.useState(() => detectDarkMode());

  React.useEffect(() => {
    const update = () => setIsDark(detectDarkMode());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);

    // Watch for Azure DevOps theme class changes on body
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => {
      mq.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  return React.createElement(
    ThemeContext.Provider,
    { value: isDark ? darkTheme : lightTheme },
    children
  );
};

export function useTheme(): ThemeColors {
  return React.useContext(ThemeContext);
}
