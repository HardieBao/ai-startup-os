import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "../..");

export function normalizeRepoPath(value) {
  return value.split(path.sep).join("/");
}

export function toRepoRelativePath(targetPath) {
  return normalizeRepoPath(path.relative(repoRoot, targetPath));
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function sanitizeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}
