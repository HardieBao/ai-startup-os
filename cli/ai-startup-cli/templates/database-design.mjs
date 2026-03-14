import { section, withHeader } from "./shared.mjs";

export const id = "database-design";

export function render(context) {
  return [
    ...withHeader(context),
    section("Data Model Priorities", [
      "- workflow instances",
      "- tasks",
      "- runs",
      "- artifacts",
      "- memory records",
    ]),
    section("Design Principle", [
      "Separate execution records from reusable definitions and from long-term memory.",
    ]),
  ].join("\n");
}
