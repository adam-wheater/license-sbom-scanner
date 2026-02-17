import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IExtensionDataService,
  IExtensionDataManager,
} from "azure-devops-extension-api";
import { ApprovedPackagesRegistry, ApprovedPackagesDocument } from "@/models/types";
import { DEFAULT_APPROVED_PACKAGES_REGISTRY } from "@/models/LicenseRegistry";
import {
  POLICY_SETTINGS_COLLECTION,
  APPROVED_PACKAGES_DOC_ID,
  APPROVED_PACKAGES_VERSION,
} from "@/utils/Constants";

export class ApprovedPackagesService {
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

  async getRegistry(): Promise<ApprovedPackagesDocument> {
    const manager = await this.getDataManager();
    try {
      return (await manager.getDocument(
        POLICY_SETTINGS_COLLECTION,
        APPROVED_PACKAGES_DOC_ID
      )) as ApprovedPackagesDocument;
    } catch {
      const seed: ApprovedPackagesDocument = {
        id: APPROVED_PACKAGES_DOC_ID,
        registry: DEFAULT_APPROVED_PACKAGES_REGISTRY,
        version: APPROVED_PACKAGES_VERSION,
      };
      await manager.setDocument(POLICY_SETTINGS_COLLECTION, seed);
      return seed;
    }
  }

  async saveRegistry(registry: ApprovedPackagesRegistry): Promise<ApprovedPackagesDocument> {
    const doc = await this.getRegistry();
    doc.registry = registry;
    const manager = await this.getDataManager();
    await manager.setDocument(POLICY_SETTINGS_COLLECTION, doc);
    return doc;
  }
}
