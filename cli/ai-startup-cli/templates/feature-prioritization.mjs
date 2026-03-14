import { section, withHeader } from "./shared.mjs";

export const id = "feature-prioritization";

export function render(context) {
  return [
    ...withHeader(context),
    section("Prioritization Basis", [
      `Context: ${context.idea}`,
      "Feature selection should favor user impact and implementation leverage.",
    ]),
    section("Recommended Ordering", [
      "- Highest: user-visible workflow capability",
      "- Medium: supporting integrations and dashboards",
      "- Lower: secondary optimization and convenience features",
    ]),
    section("Decision Rule", [
      "Ship the smallest feature slice that proves workflow value before adding breadth.",
    ]),
  ].join("\n");
}
