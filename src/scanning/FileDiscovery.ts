import { GitItem } from "azure-devops-extension-api/Git";
import * as ApiClient from "@/utils/ApiClient";
import { DEPENDENCY_FILE_PATTERNS, SKIP_PATTERNS } from "@/utils/Constants";

export interface DiscoveredFiles {
  dependencyFiles: GitItem[];
}

export async function discoverFiles(
  repoId: string,
  project: string
): Promise<DiscoveredFiles> {
  const allItems = await ApiClient.getItems(repoId, project);
  const dependencyFiles: GitItem[] = [];

  for (const item of allItems) {
    if (item.isFolder || !item.path) continue;
    if (SKIP_PATTERNS.some((p) => p.test(item.path!))) continue;
    if (DEPENDENCY_FILE_PATTERNS.some((p) => p.test(item.path!))) {
      dependencyFiles.push(item);
    }
  }

  return { dependencyFiles };
}
