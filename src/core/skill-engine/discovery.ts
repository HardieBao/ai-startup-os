import type { SkillDiscoverySource, SkillPackage } from "./types.js";

export class SkillDiscovery {
  constructor(private readonly sources: SkillDiscoverySource[]) {}

  listSources(): SkillDiscoverySource[] {
    return [...this.sources];
  }

  discoverRegistered(packages: SkillPackage[]): SkillPackage[] {
    return [...packages];
  }
}
