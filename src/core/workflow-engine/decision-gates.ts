import type { DecisionGate, DecisionGateStatus } from "../types.js";

export class DecisionGateStore {
  private readonly gates = new Map<string, DecisionGate>();

  save(gate: DecisionGate): void {
    this.gates.set(gate.id, gate);
  }

  get(gateId: string): DecisionGate | undefined {
    return this.gates.get(gateId);
  }

  list(): DecisionGate[] {
    return Array.from(this.gates.values());
  }

  updateStatus(
    gateId: string,
    status: DecisionGateStatus,
  ): DecisionGate | undefined {
    const gate = this.gates.get(gateId);
    if (!gate) return undefined;
    const updated = { ...gate, status };
    this.gates.set(gateId, updated);
    return updated;
  }
}
