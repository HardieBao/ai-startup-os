import { section, summarizePreviousResults, withHeader } from "./shared.mjs";

export const id = "api-design";

export function render(context) {
  return [
    ...withHeader(context),
    section("API Scope", [
      "Design a narrow API layer that exposes workflow state and execution results.",
    ]),
    section("Inputs Considered", summarizePreviousResults(context.previousResults).map((item) => `- ${item}`)),
    section("Suggested Endpoints", [
      "- create workflow run",
      "- list tasks by workflow instance",
      "- fetch task artifact",
      "- fetch project memory records",
    ]),
  ].join("\n");
}
