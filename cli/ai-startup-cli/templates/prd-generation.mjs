import { section, summarizePreviousResults, withHeader } from "./shared.mjs";

export const id = "prd-generation";

export function render(context) {
  return [
    ...withHeader(context),
    section("Product Vision", [
      `Build a focused private-domain automation product around the idea: ${context.idea}.`,
      "The first release should help operators automate lead capture, segmentation, and follow-up execution.",
    ]),
    section("Source Context", summarizePreviousResults(context.previousResults).map((item) => `- ${item}`)),
    section("Target Users", [
      "- Growth operators running customer acquisition and nurturing flows",
      "- SME founders needing operational leverage without a large growth team",
      "- Marketing teams that need clearer campaign-to-conversion visibility",
    ]),
    section("Core Features", [
      "- Workflow builder for lead follow-up sequences",
      "- Audience segmentation and trigger conditions",
      "- Execution dashboard with conversion and response tracking",
      "- Integration points for CRM, messaging, and reporting systems",
    ]),
    section("Success Metrics", [
      "- Reduced manual follow-up time per campaign",
      "- Higher lead-to-conversation conversion rate",
      "- Faster campaign launch turnaround",
    ]),
  ].join("\n");
}
