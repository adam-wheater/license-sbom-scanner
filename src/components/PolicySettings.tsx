import * as React from "react";
import { LicenseCategory, PolicyAction, LicensePolicy, LicenseOverride } from "@/models/types";
import { useTheme } from "@/utils/theme";
import { LICENSE_CATEGORY_COLORS, POLICY_ACTION_COLORS } from "@/utils/Constants";

interface PolicySettingsProps {
  policy: LicensePolicy;
  onSave: (policy: LicensePolicy) => Promise<void>;
  onReset: () => Promise<void>;
  loading: boolean;
}

export const PolicySettings: React.FC<PolicySettingsProps> = ({
  policy,
  onSave,
  onReset,
  loading,
}) => {
  const theme = useTheme();
  const [localPolicy, setLocalPolicy] = React.useState<LicensePolicy>(policy);
  const [saving, setSaving] = React.useState(false);
  const [newOverrideLicense, setNewOverrideLicense] = React.useState("");
  const [newOverrideAction, setNewOverrideAction] = React.useState<PolicyAction>(PolicyAction.Warn);
  const [newExclusion, setNewExclusion] = React.useState("");

  React.useEffect(() => {
    setLocalPolicy(policy);
  }, [policy]);

  const handleCategoryChange = (category: LicenseCategory, action: PolicyAction) => {
    setLocalPolicy((prev) => ({
      ...prev,
      categoryDefaults: { ...prev.categoryDefaults, [category]: action },
    }));
  };

  const addOverride = () => {
    if (!newOverrideLicense.trim()) return;
    setLocalPolicy((prev) => ({
      ...prev,
      specificOverrides: [
        ...prev.specificOverrides,
        { licenseId: newOverrideLicense.trim(), action: newOverrideAction },
      ],
    }));
    setNewOverrideLicense("");
  };

  const removeOverride = (idx: number) => {
    setLocalPolicy((prev) => ({
      ...prev,
      specificOverrides: prev.specificOverrides.filter((_, i) => i !== idx),
    }));
  };

  const addExclusion = () => {
    if (!newExclusion.trim()) return;
    setLocalPolicy((prev) => ({
      ...prev,
      excludedPackages: [...prev.excludedPackages, newExclusion.trim()],
    }));
    setNewExclusion("");
  };

  const removeExclusion = (idx: number) => {
    setLocalPolicy((prev) => ({
      ...prev,
      excludedPackages: prev.excludedPackages.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localPolicy);
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

  return (
    <div style={{ padding: 16, maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: theme.textPrimary }}>License Policy</h3>
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
          {saving ? "Saving..." : "Save Policy"}
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
          Reset to Defaults
        </button>
      </div>

      {/* Category Defaults */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Category Defaults</div>
        {Object.values(LicenseCategory).map((category) => (
          <div key={category} style={rowStyle}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: LICENSE_CATEGORY_COLORS[category],
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 13, textTransform: "capitalize" }}>{category}</span>
            <select
              value={localPolicy.categoryDefaults[category]}
              onChange={(e) => handleCategoryChange(category, e.target.value as PolicyAction)}
              style={{
                padding: "3px 6px",
                fontSize: 12,
                border: `1px solid ${theme.borderInput}`,
                borderRadius: 3,
                background: theme.bgSurface,
                color: theme.textPrimary,
              }}
            >
              {Object.values(PolicyAction).map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Specific License Overrides */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Specific License Overrides</div>
        {localPolicy.specificOverrides.map((override, idx) => (
          <div key={idx} style={rowStyle}>
            <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace" }}>
              {override.licenseId}
            </span>
            <span
              style={{
                padding: "2px 6px",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 600,
                color: "#fff",
                background: POLICY_ACTION_COLORS[override.action],
              }}
            >
              {override.action}
            </span>
            <button
              onClick={() => removeOverride(idx)}
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
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <input
            type="text"
            placeholder="SPDX License ID (e.g., GPL-3.0-only)"
            value={newOverrideLicense}
            onChange={(e) => setNewOverrideLicense(e.target.value)}
            style={{
              flex: 1,
              padding: "4px 8px",
              fontSize: 12,
              border: `1px solid ${theme.borderInput}`,
              borderRadius: 3,
              background: theme.bgSurface,
              color: theme.textPrimary,
            }}
          />
          <select
            value={newOverrideAction}
            onChange={(e) => setNewOverrideAction(e.target.value as PolicyAction)}
            style={{
              padding: "3px 6px",
              fontSize: 12,
              border: `1px solid ${theme.borderInput}`,
              borderRadius: 3,
              background: theme.bgSurface,
              color: theme.textPrimary,
            }}
          >
            {Object.values(PolicyAction).map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <button
            onClick={addOverride}
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

      {/* Excluded Packages */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Excluded Packages</div>
        {localPolicy.excludedPackages.map((pkg, idx) => (
          <div key={idx} style={rowStyle}>
            <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace" }}>{pkg}</span>
            <button
              onClick={() => removeExclusion(idx)}
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
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <input
            type="text"
            placeholder="Package name to exclude"
            value={newExclusion}
            onChange={(e) => setNewExclusion(e.target.value)}
            style={{
              flex: 1,
              padding: "4px 8px",
              fontSize: 12,
              border: `1px solid ${theme.borderInput}`,
              borderRadius: 3,
              background: theme.bgSurface,
              color: theme.textPrimary,
            }}
          />
          <button
            onClick={addExclusion}
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
