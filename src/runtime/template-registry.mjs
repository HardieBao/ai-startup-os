import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, "templates");

let registryPromise;

async function loadTemplateRegistry() {
  const entries = await fs.readdir(templatesDir, { withFileTypes: true });
  const registry = new Map();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".mjs")) continue;
    if (entry.name === "shared.mjs") continue;

    const fullPath = path.join(templatesDir, entry.name);
    const moduleRef = await import(pathToFileURL(fullPath).href);
    if (typeof moduleRef.id !== "string" || typeof moduleRef.render !== "function") {
      continue;
    }
    registry.set(moduleRef.id, moduleRef.render);
  }

  return registry;
}

export async function getTemplateRenderer(templateId) {
  if (!registryPromise) {
    registryPromise = loadTemplateRegistry();
  }

  const registry = await registryPromise;
  return registry.get(templateId) ?? registry.get("fallback");
}
