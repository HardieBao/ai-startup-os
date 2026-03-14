import type { TaskSession } from "../types.js";

export class TaskSessionStore {
  private readonly sessions = new Map<string, TaskSession>();

  save(session: TaskSession): void {
    this.sessions.set(session.id, session);
  }

  get(sessionId: string): TaskSession | undefined {
    return this.sessions.get(sessionId);
  }

  findByAgentAndTask(agentId: string, taskId: string): TaskSession | undefined {
    return Array.from(this.sessions.values()).find(
      (session) => session.agentId === agentId && session.taskId === taskId,
    );
  }

  list(): TaskSession[] {
    return Array.from(this.sessions.values());
  }
}
