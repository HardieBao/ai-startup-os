import type { AgentDefinition, AgentRole } from "../types.js";

export class AgentRegistry {
  private readonly agents = new Map<string, AgentDefinition>();

  register(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
  }

  get(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  findByRole(role: AgentRole): AgentDefinition[] {
    return this.list().filter((agent) => agent.role === role);
  }

  getOrgChart(): Array<AgentDefinition & { reports: AgentDefinition[] }> {
    return this.list().map((agent) => ({
      ...agent,
      reports: this.list().filter((candidate) => candidate.reportsTo === agent.id),
    }));
  }
}
