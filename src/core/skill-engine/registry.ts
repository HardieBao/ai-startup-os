import type { TriggerSource } from "../types.js";
import type { SkillPackage } from "./types.js";

export class SkillRegistry {
  private readonly skills = new Map<string, SkillPackage>();

  register(skill: SkillPackage): void {
    this.skills.set(skill.id, skill);
  }

  get(skillId: string): SkillPackage | undefined {
    return this.skills.get(skillId);
  }

  list(): SkillPackage[] {
    return Array.from(this.skills.values());
  }

  findTriggeredBy(source: TriggerSource): SkillPackage[] {
    return this.list().filter((skill) => skill.triggerSources.includes(source));
  }
}
