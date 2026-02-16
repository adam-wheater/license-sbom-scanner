import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IExtensionDataService,
  IExtensionDataManager,
} from "azure-devops-extension-api";
import { LicensePolicy, PolicyDocument } from "@/models/types";
import { DEFAULT_POLICY } from "@/models/LicenseRegistry";
import {
  POLICY_SETTINGS_COLLECTION,
  POLICY_DOC_ID,
  SETTINGS_VERSION,
} from "@/utils/Constants";

export class PolicySettingsService {
  private dataManagerPromise: Promise<IExtensionDataManager> | null = null;

  private async getDataManager(): Promise<IExtensionDataManager> {
    if (!this.dataManagerPromise) {
      this.dataManagerPromise = (async () => {
        const service = await SDK.getService<IExtensionDataService>(
          CommonServiceIds.ExtensionDataService
        );
        const accessToken = await SDK.getAccessToken();
        return service.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
      })();
    }
    return this.dataManagerPromise;
  }

  async getPolicy(): Promise<PolicyDocument> {
    const manager = await this.getDataManager();
    try {
      return (await manager.getDocument(
        POLICY_SETTINGS_COLLECTION,
        POLICY_DOC_ID
      )) as PolicyDocument;
    } catch {
      // Document doesn't exist yet — seed with defaults
      const seed: PolicyDocument = {
        id: POLICY_DOC_ID,
        policy: DEFAULT_POLICY,
        version: SETTINGS_VERSION,
      };
      await manager.setDocument(POLICY_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async savePolicy(policy: LicensePolicy): Promise<PolicyDocument> {
    const doc = await this.getPolicy();
    doc.policy = policy;
    const manager = await this.getDataManager();
    await manager.setDocument(POLICY_SETTINGS_COLLECTION, doc);
    return doc;
  }
}
