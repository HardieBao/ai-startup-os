import { section, summarizePreviousResults, withHeader } from "./shared.mjs";

export const id = "code-generation";

export function render(context) {
  return [
    ...withHeader(context),
    section("Implementation Scope", [
      "Create the first executable slice of the product around workflow execution and reporting.",
      "Favor a vertical slice over broad platform coverage.",
    ]),
    section("Implementation Inputs", summarizePreviousResults(context.previousResults).map((item) => `- ${item}`)),
    section("First Build Slice", [
      "- Workflow definition loading",
      "- Task materialization and queue transitions",
      "- Basic execution runner",
      "- Result persistence and memory writing",
      "- Read-only reporting output for operators",
    ]),
    section("Planned Deliverables", [
      "- Core services for workflow and task management",
      "- Execution command entrypoint",
      "- Result artifact storage",
      "- Project memory persistence",
    ]),
    section("Out Of Scope", [
      "- Full marketplace of integrations",
      "- Advanced governance UI",
      "- Multi-region or enterprise-scale deployment features",
    ]),
  ].join("\n");
}
