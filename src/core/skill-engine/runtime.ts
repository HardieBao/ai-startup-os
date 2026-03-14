import type { SkillExecutionDescriptor, SkillPackage } from "./types.js";

export class SkillRuntime {
  buildExecutionDescriptor(skillPackage: SkillPackage): SkillExecutionDescriptor {
    return {
      skillId: `${skillPackage.namespace}:${skillPackage.name}`,
      packageId: skillPackage.id,
      entrypoint: skillPackage.entrypoint,
      assets: skillPackage.assets,
      roleTemplates: skillPackage.roleTemplates ?? [],
    };
  }
}
