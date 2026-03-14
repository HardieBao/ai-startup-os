export interface UpstreamReference {
  source: "paperclip" | "superpowers";
  concept: string;
  mapsTo: string;
  rationale: string;
}

export const upstreamReferences: UpstreamReference[] = [
  {
    source: "paperclip",
    concept: "agent orchestration and org chart",
    mapsTo: "core/agent-engine",
    rationale: "Control-plane concepts belong in the agent layer, not inside skill execution.",
  },
  {
    source: "paperclip",
    concept: "task, goal, heartbeat, approval",
    mapsTo: "core/workflow-engine",
    rationale: "Workflow state and governance should coordinate work without dictating how a skill executes.",
  },
  {
    source: "superpowers",
    concept: "skills library and trigger discipline",
    mapsTo: "core/skill-engine",
    rationale: "Skill registration, trigger matching, and execution contracts are reusable independent of the host agent runtime.",
  },
  {
    source: "superpowers",
    concept: "engineering workflow patterns",
    mapsTo: "src/skills and src/workflows",
    rationale: "Planning, coding, testing, and review flows should be first-class reusable modules.",
  },
  {
    source: "superpowers",
    concept: "meta-skill bootstrap and activation policy",
    mapsTo: "core/skill-engine/activator.ts",
    rationale: "Skill activation should remain a first-class engine concern instead of being hidden in hook glue.",
  },
];
