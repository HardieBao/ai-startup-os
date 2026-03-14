import type { SkillCategory, TriggerSource } from "../types.js";

export interface HarnessCapabilities {
  supportsSubagents: boolean;
  supportsBrowser: boolean;
  supportsHooks: boolean;
  supportsWorktrees: boolean;
  supportsLongTermMemory: boolean;
}

export interface RoleTemplate {
  id: string;
  name: string;
  purpose: string;
  promptAsset?: string;
}

export interface SkillPackage {
  id: string;
  namespace: string;
  name: string;
  description: string;
  category: SkillCategory;
  entrypoint: string;
  assets: string[];
  triggerSources: TriggerSource[];
  requiresCapabilities: Array<keyof HarnessCapabilities>;
  dependsOnSkills: string[];
  fallbackSkills: string[];
  roleTemplates?: RoleTemplate[];
}

export interface SkillDiscoverySource {
  id: string;
  kind: "local-directory" | "git-repo" | "builtin";
  basePath: string;
}

export interface SkillActivationRequest {
  triggerSource: TriggerSource;
  availableCapabilities: HarnessCapabilities;
  requestedSkillId?: string;
}

export interface SkillActivationResult {
  primary: SkillPackage[];
  fallbacks: SkillPackage[];
  blocked: Array<{
    skillId: string;
    reason: string;
  }>;
}

export interface SkillExecutionDescriptor {
  skillId: string;
  packageId: string;
  entrypoint: string;
  assets: string[];
  roleTemplates: RoleTemplate[];
}
