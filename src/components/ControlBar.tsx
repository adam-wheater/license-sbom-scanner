import * as React from "react";
import { useTheme } from "@/utils/theme";

export type ViewTab = "overview" | "dependencies" | "violations" | "inconsistencies" | "sbom" | "settings" | "licenses";

interface ControlBarProps {
  scanning: boolean;
  onScan: () => void;
  onCancel?: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  hasResults: boolean;
  totalDeps: number;
  totalViolations: number;
  totalInconsistencies: number;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  scanning,
  onScan,
  onCancel,
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  hasResults,
  totalDeps,
  totalViolations,
  totalInconsistencies,
}) => {
  const theme = useTheme();

  const tabs: { key: ViewTab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "dependencies", label: "Dependencies", badge: totalDeps },
    { key: "violations", label: "Violations", badge: totalViolations },
    { key: "inconsistencies", label: "Inconsistencies", badge: totalInconsistencies },
    { key: "sbom", label: "SBOM" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderBottom: `1px solid ${theme.borderDefault}`,
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={onScan}
        disabled={scanning}
        style={{
          padding: "6px 16px",
          borderRadius: 3,
          border: "none",
          background: scanning ? theme.disabledBg : "#0078d4",
          color: "#fff",
          fontWeight: 600,
          fontSize: 13,
          cursor: scanning ? "not-allowed" : "pointer",
        }}
      >
        {scanning ? "Scanning..." : "Scan All Repos"}
      </button>
      {scanning && onCancel && (
        <button
          onClick={onCancel}
          style={{
            padding: "6px 16px",
            borderRadius: 3,
            border: `1px solid ${theme.borderDefault}`,
            background: theme.btnCancelBg,
            color: theme.errorText,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      )}

      {hasResults && (
        <div
          style={{
            display: "flex",
            gap: 0,
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${theme.borderDefault}`,
            marginLeft: 8,
          }}
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                padding: "5px 12px",
                border: "none",
                background: activeTab === tab.key ? "#0078d4" : theme.btnDefaultBg,
                color: activeTab === tab.key ? "#fff" : theme.textPrimary,
                fontSize: 12,
                cursor: "pointer",
                borderRight:
                  i < tabs.length - 1 ? `1px solid ${theme.borderDefault}` : "none",
              }}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  style={{
                    marginLeft: 4,
                    padding: "1px 5px",
                    borderRadius: 8,
                    fontSize: 10,
                    background:
                      activeTab === tab.key
                        ? "rgba(255,255,255,0.3)"
                        : theme.bgSurfaceAlt,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => onTabChange("licenses")}
        style={{
          padding: "5px 12px",
          border: `1px solid ${theme.borderDefault}`,
          borderRadius: 3,
          background: activeTab === "licenses" ? "#0078d4" : theme.btnDefaultBg,
          color: activeTab === "licenses" ? "#fff" : theme.textPrimary,
          fontSize: 12,
          cursor: "pointer",
          marginLeft: hasResults ? 0 : 8,
        }}
      >
        License Guide
      </button>

      {(activeTab === "dependencies" || activeTab === "violations" || activeTab === "inconsistencies") && (
        <input
          type="text"
          placeholder="Search packages..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            marginLeft: "auto",
            padding: "5px 10px",
            border: `1px solid ${theme.borderInput}`,
            borderRadius: 3,
            fontSize: 12,
            background: theme.bgSurface,
            color: theme.textPrimary,
            width: 200,
            outline: "none",
          }}
        />
      )}
    </div>
  );
};
