import * as React from "react";
import { ApprovedPackagesService } from "@/services/ApprovedPackagesService";
import { ApprovedPackagesRegistry } from "@/models/types";
import { DEFAULT_APPROVED_PACKAGES_REGISTRY } from "@/models/LicenseRegistry";

export interface UseApprovedPackagesResult {
  loading: boolean;
  error: string | null;
  registry: ApprovedPackagesRegistry;
  saveRegistry: (registry: ApprovedPackagesRegistry) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useApprovedPackages(): UseApprovedPackagesResult {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [registry, setRegistry] = React.useState<ApprovedPackagesRegistry>(
    DEFAULT_APPROVED_PACKAGES_REGISTRY
  );
  const serviceRef = React.useRef(new ApprovedPackagesService());

  const loadRegistry = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const doc = await serviceRef.current.getRegistry();
      setRegistry(doc.registry);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRegistry();
  }, [loadRegistry]);

  const saveRegistry = React.useCallback(async (newRegistry: ApprovedPackagesRegistry) => {
    try {
      const doc = await serviceRef.current.saveRegistry(newRegistry);
      setRegistry(doc.registry);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const resetToDefaults = React.useCallback(async () => {
    try {
      const doc = await serviceRef.current.saveRegistry(DEFAULT_APPROVED_PACKAGES_REGISTRY);
      setRegistry(doc.registry);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return { loading, error, registry, saveRegistry, resetToDefaults, reload: loadRegistry };
}
