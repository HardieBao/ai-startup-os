import type { WorkflowInstance, WorkflowInstanceStatus } from "../types.js";

export class WorkflowInstanceStore {
  private readonly instances = new Map<string, WorkflowInstance>();

  save(instance: WorkflowInstance): void {
    this.instances.set(instance.id, instance);
  }

  get(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  list(): WorkflowInstance[] {
    return Array.from(this.instances.values());
  }

  updateStatus(
    instanceId: string,
    status: WorkflowInstanceStatus,
  ): WorkflowInstance | undefined {
    const instance = this.instances.get(instanceId);
    if (!instance) return undefined;
    const updated = { ...instance, status };
    this.instances.set(instanceId, updated);
    return updated;
  }

  setCurrentStep(
    instanceId: string,
    currentStepId: string,
  ): WorkflowInstance | undefined {
    const instance = this.instances.get(instanceId);
    if (!instance) return undefined;
    const updated = { ...instance, currentStepId };
    this.instances.set(instanceId, updated);
    return updated;
  }
}
