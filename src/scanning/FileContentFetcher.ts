import { GitItem } from "azure-devops-extension-api/Git";
import * as ApiClient from "@/utils/ApiClient";
import { ConcurrencyLimiter } from "@/utils/ConcurrencyLimiter";
import { MAX_CONCURRENT_FILES, MAX_FILE_SIZE } from "@/utils/Constants";

export interface FileContent {
  path: string;
  content: string;
}

export async function fetchFileContents(
  repoId: string,
  project: string,
  files: GitItem[]
): Promise<FileContent[]> {
  const limiter = new ConcurrencyLimiter(MAX_CONCURRENT_FILES);
  const results: FileContent[] = [];

  await limiter.map(files, async (file) => {
    if (!file.path) return;

    const content = await ApiClient.getItemText(repoId, file.path, project);
    if (content && content.length <= MAX_FILE_SIZE) {
      results.push({ path: file.path, content });
    }
  });

  return results;
}
