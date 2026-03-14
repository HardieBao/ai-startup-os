import type { Task, TaskStatus } from "../types.js";

export class TaskStore {
  private readonly tasks = new Map<string, Task>();

  save(task: Task): void {
    this.tasks.set(task.id, task);
  }

  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  list(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateStatus(taskId: string, status: TaskStatus): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    const updated = { ...task, status };
    this.tasks.set(taskId, updated);
    return updated;
  }

  assignRun(taskId: string, runId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    if (task.executionRunId && task.executionRunId !== runId) {
      throw new Error(
        `Task ${taskId} is already checked out by run ${task.executionRunId}`,
      );
    }
    const updated = {
      ...task,
      checkoutRunId: task.checkoutRunId ?? runId,
      executionRunId: runId,
      status: "in_progress" as const,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  releaseRun(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    const updated = {
      ...task,
      executionRunId: undefined,
      checkoutRunId: undefined,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }
}
