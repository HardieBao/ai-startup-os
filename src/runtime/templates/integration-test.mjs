import { section, summarizePreviousResults, withHeader } from "./shared.mjs";

export const id = "integration-test";

export function render(context) {
  return [
    ...withHeader(context),
    section("Verification Scope", [
      "Validate that the workflow produced coherent downstream artifacts.",
      "Check that implementation scope still matches the original product direction.",
    ]),
    section("Artifacts Reviewed", summarizePreviousResults(context.previousResults).map((item) => `- ${item}`)),
    section("Verification Checks", [
      "- Upstream analysis aligns with downstream design",
      "- Intermediate artifacts narrow scope instead of expanding it uncontrollably",
      "- Final implementation slice is consistent with architecture and scope",
    ]),
    section("QA Verdict", [
      "- Workflow artifacts are internally consistent for a first-pass execution",
      "- The implementation slice is plausible and bounded",
      "- Next step should be real execution rather than more design expansion",
    ]),
  ].join("\n");
}
