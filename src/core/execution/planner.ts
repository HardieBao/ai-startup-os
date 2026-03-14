import type {
  AgentDefinition,
  ExecutionPlan,
  Goal,
  Task,
  WorkflowDefinition,
  WorkflowInstance,
} from "../types.js";
import type { SkillPackage } from "../skill-engine/types.js";

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function buildExecutionPlan(input: {
  goal: Goal;
  workflow: WorkflowDefinition;
  workflowInstance: WorkflowInstance;
  agents: AgentDefinition[];
  skills: SkillPackage[];
  tasks: Task[];
}): ExecutionPlan {
  const referencedSkills = dedupeById(
    input.workflow.steps.flatMap((step) =>
      step.skillIds
        .map((skillId) => input.skills.find((skill) => skill.id === skillId))
        .filter((skill): skill is SkillPackage => Boolean(skill)),
    ),
  );

  const referencedAgents = dedupeById(
    input.workflow.steps.flatMap((step) =>
      input.agents.filter((agent) => agent.role === step.ownerRole),
    ),
  );

  return {
    goal: input.goal,
    workflow: input.workflow,
    workflowInstance: input.workflowInstance,
    agents: referencedAgents,
    skills: referencedSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
    })),
    tasks: input.tasks,
  };
}
