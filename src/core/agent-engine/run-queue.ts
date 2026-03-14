import type { Run } from "../types.js";

export class RunQueue {
  private readonly runs = new Map<string, Run>();

  enqueue(run: Run): void {
    this.runs.set(run.id, run);
  }

  get(runId: string): Run | undefined {
    return this.runs.get(runId);
  }

  list(): Run[] {
    return Array.from(this.runs.values());
  }

  byAgent(agentId: string): Run[] {
    return this.list().filter((run) => run.agentId === agentId);
  }

  updateStatus(runId: string, status: Run["status"]): Run | undefined {
    const run = this.runs.get(runId);
    if (!run) return undefined;
    const updated = { ...run, status };
    this.runs.set(runId, updated);
    return updated;
  }
}
