import { section, summarizePreviousResults, withHeader } from "./shared.mjs";

export const id = "unit-test";

export function render(context) {
  return [
    ...withHeader(context),
    section("Unit Test Focus", [
      "Cover the narrowest logic slice changed by the implementation task.",
    ]),
    section("Inputs Considered", summarizePreviousResults(context.previousResults).map((item) => `- ${item}`)),
    section("Suggested Test Targets", [
      "- workflow step transition logic",
      "- task status updates",
      "- artifact persistence behavior",
    ]),
  ].join("\n");
}
