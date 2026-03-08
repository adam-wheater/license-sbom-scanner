import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IExtensionDataService,
  IExtensionDataManager,
} from "azure-devops-extension-api";

export class BaseDataService {
  private dataManagerPromise: Promise<IExtensionDataManager> | null = null;

  protected async getDataManager(): Promise<IExtensionDataManager> {
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
}
