import { section, withHeader } from "./shared.mjs";

export const id = "bug-analysis";

export function render(context) {
  return [
    ...withHeader(context),
    section("Defect Summary", [
      `Problem space: ${context.idea}`,
      "The issue should be isolated before any broad architectural change is applied.",
    ]),
    section("Observed Risks", [
      "- User-facing regression is likely reproducible in a narrow flow",
      "- A fix should avoid widening scope into a platform rewrite",
      "- Verification needs explicit regression coverage",
    ]),
    section("Recommended Fix Path", [
      "- Capture the failing behavior precisely",
      "- Identify the minimal architectural or logic boundary involved",
      "- Patch the smallest viable slice and retest",
    ]),
  ].join("\n");
}
