import { AgentRegistry } from "./core/agent-engine/registry.js";
import { RunQueue } from "./core/agent-engine/run-queue.js";
import { TaskSessionStore } from "./core/agent-engine/task-sessions.js";
import { buildExecutionPlan } from "./core/execution/planner.js";
import { MemoryStore } from "./core/memory-engine/store.js";
import type { Goal } from "./core/types.js";
import { DecisionGateStore } from "./core/workflow-engine/decision-gates.js";
import { WorkflowInstanceStore } from "./core/workflow-engine/instances.js";
import { WorkflowRegistry } from "./core/workflow-engine/registry.js";
import { WorkflowRunner } from "./core/workflow-engine/runner.js";
import { TaskStore } from "./core/workflow-engine/task-store.js";
import { SkillActivator } from "./core/skill-engine/activator.js";
import { SkillDiscovery } from "./core/skill-engine/discovery.js";
import { SkillRegistry } from "./core/skill-engine/registry.js";
import { SkillRuntime } from "./core/skill-engine/runtime.js";
import { agentCatalog } from "./agents/index.js";
import { skillCatalog } from "./skills/index.js";
import { workflowCatalog } from "./workflows/index.js";

export function createSystemCatalog() {
  const agents = new AgentRegistry();
  const skills = new SkillRegistry();
  const workflows = new WorkflowRegistry();
  const runs = new RunQueue();
  const taskSessions = new TaskSessionStore();
  const workflowInstances = new WorkflowInstanceStore();
  const tasks = new TaskStore();
  const decisionGates = new DecisionGateStore();
  const workflowRunner = new WorkflowRunner(workflowInstances, tasks);
  const memory = new MemoryStore();
  const skillDiscovery = new SkillDiscovery([
    {
      id: "builtin-startup-os",
      kind: "builtin",
      basePath: "skills",
    },
  ]);
  const skillActivator = new SkillActivator();
  const skillRuntime = new SkillRuntime();

  agentCatalog.forEach((agent) => agents.register(agent));
  skillCatalog.forEach((skill) => skills.register(skill));
  workflowCatalog.forEach((workflow) => workflows.register(workflow));

  return {
    agents,
    skills,
    workflows,
    runs,
    taskSessions,
    workflowInstances,
    tasks,
    decisionGates,
    workflowRunner,
    memory,
    skillDiscovery,
    skillActivator,
    skillRuntime,
  };
}

export function planGoal(goal: Goal) {
  const catalog = createSystemCatalog();
  const workflow = catalog.workflows.get(goal.workflowId);
  if (!workflow) {
    throw new Error(`Unknown workflow: ${goal.workflowId}`);
  }

  const workflowInstance = catalog.workflowRunner.createInstance(goal, workflow);
  const tasks = catalog.workflowRunner.materializeTasks({
    goal,
    workflow,
    workflowInstance,
    agents: catalog.agents.list(),
  });

  return buildExecutionPlan({
    goal,
    workflow,
    workflowInstance,
    agents: catalog.agents.list(),
    skills: catalog.skills.list(),
    tasks,
  });
}
