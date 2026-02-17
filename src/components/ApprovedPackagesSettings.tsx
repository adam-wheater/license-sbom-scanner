import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
  Ecosystem,
  ApprovedPackagesRegistry,
  ApprovedPackageEntry,
  AutoApprovalRule,
} from "@/models/types";
import { useTheme } from "@/utils/theme";
import { ECOSYSTEM_COLORS } from "@/utils/Constants";

interface ApprovedPackagesSettingsProps {
  registry: ApprovedPackagesRegistry;
  onSave: (registry: ApprovedPackagesRegistry) => Promise<void>;
  onReset: () => Promise<void>;
  loading: boolean;
}

function getCurrentUser(): string {
  try {
    return SDK.getUser().displayName || "Unknown";
  } catch {
    return "Unknown";
  }
}

export const ApprovedPackagesSettings: React.FC<ApprovedPackagesSettingsProps> = ({
  registry,
  onSave,
  onReset,
  loading,
}) => {
  const theme = useTheme();
  const [localRegistry, setLocalRegistry] = React.useState<ApprovedPackagesRegistry>(registry);
  const [saving, setSaving] = React.useState(false);

  // Auto-approval rule form
  const [newRulePattern, setNewRulePattern] = React.useState("");
  const [newRuleEcosystem, setNewRuleEcosystem] = React.useState<Ecosystem>(Ecosystem.NuGet);
  const [newRuleReason, setNewRuleReason] = React.useState("");

  // Approved package form
  const [newPkgName, setNewPkgName] = React.useState("");
  const [newPkgEcosystem, setNewPkgEcosystem] = React.useState<Ecosystem>(Ecosystem.NuGet);
  const [newPkgReason, setNewPkgReason] = React.useState("");

  React.useEffect(() => {
    setLocalRegistry(registry);
  }, [registry]);

  const addRule = () => {
    if (!newRulePattern.trim()) return;
    const rule: AutoApprovalRule = {
      pattern: newRulePattern.trim(),
      ecosystem: newRuleEcosystem,
      approvedBy: getCurrentUser(),
      approvedAt: new Date().toISOString(),
      reason: newRuleReason.trim() || "Auto-approval rule",
    };
    setLocalRegistry((prev) => ({
      ...prev,
      autoApprovalRules: [...prev.autoApprovalRules, rule],
    }));
    setNewRulePattern("");
    setNewRuleReason("");
  };

  const removeRule = (idx: number) => {
    setLocalRegistry((prev) => ({
      ...prev,
      autoApprovalRules: prev.autoApprovalRules.filter((_, i) => i !== idx),
    }));
  };

  const addPackage = () => {
    if (!newPkgName.trim()) return;
    const entry: ApprovedPackageEntry = {
      name: newPkgName.trim(),
      ecosystem: newPkgEcosystem,
      approvedBy: getCurrentUser(),
      approvedAt: new Date().toISOString(),
      reason: newPkgReason.trim() || "Approved",
    };
    setLocalRegistry((prev) => ({
      ...prev,
      packages: [...prev.packages, entry],
    }));
    setNewPkgName("");
    setNewPkgReason("");
  };

  const removePackage = (idx: number) => {
    setLocalRegistry((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localRegistry);
    } finally {
      setSaving(false);
    }
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
    border: `1px solid ${theme.borderDefault}`,
    borderRadius: 4,
    overflow: "hidden",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 600,
    background: theme.bgSurface,
    borderBottom: `1px solid ${theme.borderDefault}`,
    color: theme.textPrimary,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    gap: 12,
    borderBottom: `1px solid ${theme.borderRow}`,
  };

  const inputStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: 12,
    border: `1px solid ${theme.borderInput}`,
    borderRadius: 3,
    background: theme.bgSurface,
    color: theme.textPrimary,
  };

  const selectStyle: React.CSSProperties = {
    padding: "3px 6px",
    fontSize: 12,
    border: `1px solid ${theme.borderInput}`,
    borderRadius: 3,
    background: theme.bgSurface,
    color: theme.textPrimary,
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ padding: "16px 16px 0", maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: theme.textPrimary }}>Approved Packages</h3>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            padding: "5px 12px",
            borderRadius: 3,
            border: "none",
            background: saving ? theme.disabledBg : "#0078d4",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onReset}
          disabled={saving || loading}
          style={{
            padding: "5px 12px",
            borderRadius: 3,
            border: `1px solid ${theme.borderDefault}`,
            background: theme.btnCancelBg,
            color: theme.textPrimary,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Clear All
        </button>
      </div>

      {/* Auto-Approval Rules */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          Auto-Approval Rules
          <span style={{ fontWeight: 400, color: theme.textMuted, marginLeft: 8 }}>
            Use * as wildcard (e.g., Microsoft.*, System.*, @angular/*)
          </span>
        </div>
        {localRegistry.autoApprovalRules.map((rule, idx) => (
          <div key={idx} style={rowStyle}>
            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 500, minWidth: 150 }}>
              {rule.pattern}
            </span>
            <span
              style={{
                padding: "2px 6px",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 600,
                color: "#fff",
                background: ECOSYSTEM_COLORS[rule.ecosystem],
              }}
            >
              {rule.ecosystem}
            </span>
            <span style={{ fontSize: 11, color: theme.textMuted, flex: 1 }} title={rule.reason}>
              {rule.reason}
            </span>
            <span style={{ fontSize: 10, color: theme.textMuted, whiteSpace: "nowrap" }}>
              {rule.approvedBy} &middot; {formatDate(rule.approvedAt)}
            </span>
            <button
              onClick={() => removeRule(idx)}
              style={{
                padding: "2px 6px",
                borderRadius: 3,
                border: "none",
                background: theme.errorBg,
                color: theme.errorText,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <div style={{ ...rowStyle, borderBottom: "none", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Pattern (e.g., Microsoft.*)"
            value={newRulePattern}
            onChange={(e) => setNewRulePattern(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 140px" }}
          />
          <select
            value={newRuleEcosystem}
            onChange={(e) => setNewRuleEcosystem(e.target.value as Ecosystem)}
            style={selectStyle}
          >
            {Object.values(Ecosystem).map((eco) => (
              <option key={eco} value={eco}>
                {eco}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Reason"
            value={newRuleReason}
            onChange={(e) => setNewRuleReason(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 120px" }}
          />
          <button
            onClick={addRule}
            style={{
              padding: "4px 10px",
              borderRadius: 3,
              border: "none",
              background: "#0078d4",
              color: "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Explicit Approved Packages */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Individual Approved Packages</div>
        {localRegistry.packages.map((pkg, idx) => (
          <div key={idx} style={rowStyle}>
            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 500, minWidth: 150 }}>
              {pkg.name}
            </span>
            <span
              style={{
                padding: "2px 6px",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 600,
                color: "#fff",
                background: ECOSYSTEM_COLORS[pkg.ecosystem],
              }}
            >
              {pkg.ecosystem}
            </span>
            <span style={{ fontSize: 11, color: theme.textMuted, flex: 1 }} title={pkg.reason}>
              {pkg.reason}
            </span>
            <span style={{ fontSize: 10, color: theme.textMuted, whiteSpace: "nowrap" }}>
              {pkg.approvedBy} &middot; {formatDate(pkg.approvedAt)}
            </span>
            <button
              onClick={() => removePackage(idx)}
              style={{
                padding: "2px 6px",
                borderRadius: 3,
                border: "none",
                background: theme.errorBg,
                color: theme.errorText,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <div style={{ ...rowStyle, borderBottom: "none", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Package name"
            value={newPkgName}
            onChange={(e) => setNewPkgName(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 140px" }}
          />
          <select
            value={newPkgEcosystem}
            onChange={(e) => setNewPkgEcosystem(e.target.value as Ecosystem)}
            style={selectStyle}
          >
            {Object.values(Ecosystem).map((eco) => (
              <option key={eco} value={eco}>
                {eco}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Reason"
            value={newPkgReason}
            onChange={(e) => setNewPkgReason(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 120px" }}
          />
          <button
            onClick={addPackage}
            style={{
              padding: "4px 10px",
              borderRadius: 3,
              border: "none",
              background: "#0078d4",
              color: "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
