import * as React from "react";
import { ScanProgress as ScanProgressType } from "@/models/types";
import { useTheme } from "@/utils/theme";

interface ScanProgressProps {
  progress: ScanProgressType;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ progress }) => {
  const theme = useTheme();
  const pct =
    progress.reposTotal > 0
      ? Math.round((progress.reposCompleted / progress.reposTotal) * 100)
      : 0;

  if (progress.phase === "complete") return null;

  return (
    <div style={{ padding: "8px 16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: theme.bgProgressTrack,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 3,
              background: "#0078d4",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span style={{ fontSize: 12, color: theme.textSecondary, minWidth: 36 }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 12, color: theme.textMuted }}>
        {progress.message}
        {progress.failedRepos && progress.failedRepos.length > 0 && (
          <span style={{ color: theme.errorText, marginLeft: 8 }}>
            ({progress.failedRepos.length} failed)
          </span>
        )}
      </div>
    </div>
  );
};
