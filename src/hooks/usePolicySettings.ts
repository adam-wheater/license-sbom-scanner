import * as React from "react";
import { PolicySettingsService } from "@/services/PolicySettingsService";
import { LicensePolicy } from "@/models/types";
import { DEFAULT_POLICY } from "@/models/LicenseRegistry";

export interface UsePolicySettingsResult {
  loading: boolean;
  error: string | null;
  policy: LicensePolicy;
  savePolicy: (policy: LicensePolicy) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  reload: () => Promise<void>;
}

export function usePolicySettings(): UsePolicySettingsResult {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [policy, setPolicy] = React.useState<LicensePolicy>(DEFAULT_POLICY);
  const serviceRef = React.useRef(new PolicySettingsService());

  const loadPolicy = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const doc = await serviceRef.current.getPolicy();
      setPolicy(doc.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const savePolicy = React.useCallback(async (newPolicy: LicensePolicy) => {
    try {
      const doc = await serviceRef.current.savePolicy(newPolicy);
      setPolicy(doc.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const resetToDefaults = React.useCallback(async () => {
    try {
      const doc = await serviceRef.current.savePolicy(DEFAULT_POLICY);
      setPolicy(doc.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { loading, error, policy, savePolicy, resetToDefaults, reload: loadPolicy };
}
