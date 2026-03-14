import type { WorkflowDefinition } from "../types.js";

export class WorkflowRegistry {
  private readonly workflows = new Map<string, WorkflowDefinition>();

  register(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  get(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  list(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }
}
