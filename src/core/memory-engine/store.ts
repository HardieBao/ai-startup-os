export interface MemoryRecord {
  id: string;
  scope: "company" | "project" | "codebase" | "knowledge" | "task";
  namespace: string;
  summary: string;
  tags: string[];
}

export class MemoryStore {
  private readonly records = new Map<string, MemoryRecord>();

  save(record: MemoryRecord): void {
    this.records.set(record.id, record);
  }

  get(recordId: string): MemoryRecord | undefined {
    return this.records.get(recordId);
  }

  list(): MemoryRecord[] {
    return Array.from(this.records.values());
  }

  findByScope(scope: MemoryRecord["scope"]): MemoryRecord[] {
    return this.list().filter((record) => record.scope === scope);
  }

  findByTag(tag: string): MemoryRecord[] {
    return this.list().filter((record) => record.tags.includes(tag));
  }
}
