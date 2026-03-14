import { section, withHeader } from "./shared.mjs";

export const id = "opportunity-analysis";

export function render(context) {
  const marketSignals = [
    "Businesses need repeatable lead activation and follow-up workflows.",
    "Private-domain operations benefit from automation tied to customer lifecycle stages.",
    "Operators want lower manual coordination cost across CRM, messaging, and analytics.",
  ];

  const constraints = [
    "Must support incremental rollout rather than a full platform rewrite.",
    "Should fit SMB and mid-market operators with limited automation staff.",
    "Needs clear ROI visibility through measurable activation and retention metrics.",
  ];

  const recommendations = [
    "Start with one strong workflow: lead capture to follow-up automation.",
    "Build product around configurable workflow orchestration and delivery analytics.",
    "Treat integration reliability and operator visibility as differentiators, not afterthoughts.",
  ];

  return [
    ...withHeader(context),
    section("Goal Framing", [
      `Idea: ${context.idea}`,
      "Objective: Validate whether this should proceed as a product build workflow.",
    ]),
    section("Market Signals", marketSignals.map((item) => `- ${item}`)),
    section("Primary Constraints", constraints.map((item) => `- ${item}`)),
    section("Recommendation", recommendations.map((item) => `- ${item}`)),
  ].join("\n");
}
