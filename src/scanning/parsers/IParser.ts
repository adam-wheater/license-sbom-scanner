import { ParsedDependency, Ecosystem } from "@/models/types";

export interface IParser {
  readonly ecosystem: Ecosystem;
  readonly filePatterns: RegExp[];
  parse(repoName: string, filePath: string, content: string): ParsedDependency[];
}
