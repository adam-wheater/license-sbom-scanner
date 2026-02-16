import { getClient } from "azure-devops-extension-api";
import {
  GitRestClient,
  GitRepository,
  GitItem,
  VersionControlRecursionType,
} from "azure-devops-extension-api/Git";

let gitClient: GitRestClient | null = null;

function getGitClient(): GitRestClient {
  if (!gitClient) {
    gitClient = getClient(GitRestClient);
  }
  return gitClient;
}

export function resetClient(): void {
  gitClient = null;
}

export async function getRepositories(project: string): Promise<GitRepository[]> {
  const client = getGitClient();
  return client.getRepositories(project);
}

export async function getItems(
  repoId: string,
  project: string,
  scopePath = "/",
  recursionLevel: VersionControlRecursionType = VersionControlRecursionType.Full
): Promise<GitItem[]> {
  try {
    const client = getGitClient();
    return await client.getItems(repoId, project, scopePath, recursionLevel);
  } catch (err) {
    console.warn(`Failed to get items for repo ${repoId}:`, err);
    return [];
  }
}

export async function getItemText(
  repoId: string,
  path: string,
  project: string
): Promise<string> {
  try {
    const client = getGitClient();
    return await client.getItemText(repoId, path, project);
  } catch (err) {
    console.warn(`Failed to get item text ${path} in ${repoId}:`, err);
    return "";
  }
}
