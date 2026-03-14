import type {
  AgentDefinition,
  Goal,
  Task,
  WorkflowDefinition,
  WorkflowInstance,
} from "../types.js";
import { TaskStore } from "./task-store.js";
import { WorkflowInstanceStore } from "./instances.js";

export class WorkflowRunner {
  constructor(
    private readonly instances: WorkflowInstanceStore,
    private readonly tasks: TaskStore,
  ) {}

  createInstance(goal: Goal, workflow: WorkflowDefinition): WorkflowInstance {
    const instance: WorkflowInstance = {
      id: `${goal.id}-workflow-instance`,
      workflowId: workflow.id,
      goalId: goal.id,
      companyId: goal.companyId,
      status: "active",
      currentStepId: workflow.steps[0]?.id,
      createdTaskIds: [],
    };
    this.instances.save(instance);
    return instance;
  }

  materializeTasks(input: {
    goal: Goal;
    workflow: WorkflowDefinition;
    workflowInstance: WorkflowInstance;
    agents: AgentDefinition[];
  }): Task[] {
    const createdTasks = input.workflow.steps.map((step, index) => {
      const assignedAgent = input.agents.find((agent) => agent.role === step.ownerRole);
      const task: Task = {
        id: `${input.goal.id}-task-${index + 1}`,
        title: step.name,
        summary: step.summary,
        workflowId: input.workflow.id,
        workflowInstanceId: input.workflowInstance.id,
        stepId: step.id,
        status: index === 0 ? "ready" : "pending",
        assignedAgentId: assignedAgent?.id,
        requiredSkillIds: step.skillIds,
        dependsOn: index === 0 ? [] : [`${input.goal.id}-task-${index}`],
      };
      this.tasks.save(task);
      return task;
    });

    this.instances.save({
      ...input.workflowInstance,
      createdTaskIds: createdTasks.map((task) => task.id),
    });

    return createdTasks;
  }

  advanceTask(taskId: string): Task | undefined {
    const task = this.tasks.updateStatus(taskId, "done");
    if (!task) return undefined;

    const dependentTask = this.tasks
      .list()
      .find((candidate) => candidate.dependsOn?.includes(taskId) && candidate.status === "pending");

    if (dependentTask) {
      this.tasks.updateStatus(dependentTask.id, "ready");
      const instance = this.instances.get(dependentTask.workflowInstanceId);
      if (instance) {
        this.instances.setCurrentStep(instance.id, dependentTask.stepId);
      }
    } else {
      const instance = this.instances.get(task.workflowInstanceId);
      if (instance) {
        this.instances.updateStatus(instance.id, "completed");
      }
    }

    return task;
  }
}
