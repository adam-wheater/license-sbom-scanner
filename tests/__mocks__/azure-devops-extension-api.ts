// Mock for azure-devops-extension-api and all its subpaths
const mockClients: Record<string, any> = {};

export const CommonServiceIds = {
  ProjectPageService: "ms.vss-tfs-web.tfs-page-data-service",
  ExtensionDataService: "ms.vss-features.extension-data-service",
};

export class GitRestClient {
  static _mockName = "GitRestClient";
}

export interface GitRepository {
  id: string;
  name: string;
  webUrl?: string;
  defaultBranch?: string;
}

export interface GitItem {
  path?: string;
  isFolder?: boolean;
  size?: number;
}

export const VersionControlRecursionType = {
  Full: 120,
};

export interface IExtensionDataService {
  getExtensionDataManager(
    extensionId: string,
    accessToken: string
  ): Promise<IExtensionDataManager>;
}

export interface IExtensionDataManager {
  getDocument(collectionName: string, id: string): Promise<any>;
  setDocument(collectionName: string, doc: any): Promise<any>;
}

export function getClient(clientClass: any): any {
  if (!clientClass) return {};
  const name = clientClass._mockName || clientClass.name || "unknown";
  if (!mockClients[name]) {
    mockClients[name] = {};
  }
  return mockClients[name];
}

export function __setMockClient(name: string, client: any): void {
  mockClients[name] = client;
}

export function __resetMockClients(): void {
  for (const key of Object.keys(mockClients)) {
    delete mockClients[key];
  }
}
