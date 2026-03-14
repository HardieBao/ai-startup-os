import { section, summarizePreviousResults, withHeader } from "./shared.mjs";

export const id = "system-architecture";

export function render(context) {
  return [
    ...withHeader(context),
    section("Architecture Summary", [
      "Use a modular service-oriented core centered on workflow orchestration, task execution, and long-term memory.",
      "Separate company control-plane concerns from execution adapters so the product can support multiple agent runtimes later.",
    ]),
    section("Inputs Considered", summarizePreviousResults(context.previousResults).map((item) => `- ${item}`)),
    section("Major Components", [
      "- Workflow service: defines and advances customer automation flows",
      "- Task service: tracks assigned work, status, and execution outputs",
      "- Integration service: handles CRM, messaging, and analytics connectors",
      "- Memory service: stores project, company, and execution knowledge",
      "- UI/API layer: exposes operator controls and reporting views",
    ]),
    section("Data Boundaries", [
      "- Company data should remain isolated by tenant boundary",
      "- Workflow state should be separate from execution logs",
      "- Execution artifacts should be stored independently from prompt/skill definitions",
    ]),
    section("Engineering Priorities", [
      "- Start with deterministic workflow state transitions",
      "- Keep adapters thin and replaceable",
      "- Make task and memory models stable before scaling integrations",
    ]),
  ].join("\n");
}
