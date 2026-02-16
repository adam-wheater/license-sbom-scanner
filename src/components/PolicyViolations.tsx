import * as React from "react";
import { PolicyViolation, PolicyAction } from "@/models/types";
import { useTheme } from "@/utils/theme";
import { POLICY_ACTION_COLORS } from "@/utils/Constants";
import { LicenseBadge } from "./LicenseBadge";

interface PolicyViolationsProps {
  violations: PolicyViolation[];
  searchTerm: string;
}

export const PolicyViolations: React.FC<PolicyViolationsProps> = ({
  violations,
  searchTerm,
}) => {
  const theme = useTheme();

  const filtered = React.useMemo(() => {
    if (!searchTerm) return violations;
    const lower = searchTerm.toLowerCase();
    return violations.filter(
      (v) =>
        v.dependency.name.toLowerCase().includes(lower) ||
        v.dependency.license.toLowerCase().includes(lower) ||
        v.repoName.toLowerCase().includes(lower)
    );
  }, [violations, searchTerm]);

  const blocked = filtered.filter((v) => v.action === PolicyAction.Block);
  const warned = filtered.filter((v) => v.action === PolicyAction.Warn);

  const renderViolation = (v: PolicyViolation, idx: number) => (
    <div
      key={`${v.repoName}-${v.dependency.name}-${idx}`}
      style={{
        padding: "8px 12px",
        borderBottom: `1px solid ${theme.borderRow}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          background: POLICY_ACTION_COLORS[v.action],
          textTransform: "uppercase",
          minWidth: 48,
          textAlign: "center",
        }}
      >
        {v.action}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, fontFamily: "monospace" }}>
          {v.dependency.name}
          <span style={{ color: theme.textMuted, fontWeight: 400 }}>
            @{v.dependency.version}
          </span>
        </div>
        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{v.reason}</div>
      </div>
      <LicenseBadge license={v.dependency.license} category={v.dependency.licenseCategory} />
      <span style={{ fontSize: 11, color: theme.textMuted, whiteSpace: "nowrap" }}>
        {v.repoName}
      </span>
    </div>
  );

  if (filtered.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: theme.textMuted }}>
        {violations.length === 0
          ? "No policy violations found. All dependencies comply with your license policy."
          : "No violations match the current search."}
      </div>
    );
  }

  return (
    <div>
      {blocked.length > 0 && (
        <div>
          <div
            style={{
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: theme.errorText,
              background: theme.errorBg,
              borderBottom: `1px solid ${theme.borderDefault}`,
            }}
          >
            Blocked ({blocked.length})
          </div>
          {blocked.map(renderViolation)}
        </div>
      )}
      {warned.length > 0 && (
        <div>
          <div
            style={{
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: theme.warningText,
              background: theme.warningBg,
              borderBottom: `1px solid ${theme.borderDefault}`,
            }}
          >
            Warnings ({warned.length})
          </div>
          {warned.map(renderViolation)}
        </div>
      )}
    </div>
  );
};
