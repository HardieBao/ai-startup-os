import type {
  SkillActivationRequest,
  SkillActivationResult,
  SkillPackage,
} from "./types.js";

function supportsAllCapabilities(
  skillPackage: SkillPackage,
  request: SkillActivationRequest,
): boolean {
  return skillPackage.requiresCapabilities.every(
    (capability) => request.availableCapabilities[capability],
  );
}

export class SkillActivator {
  activate(
    skillPackages: SkillPackage[],
    request: SkillActivationRequest,
  ): SkillActivationResult {
    const requested = request.requestedSkillId
      ? skillPackages.filter((pkg) => pkg.id === request.requestedSkillId)
      : skillPackages.filter((pkg) =>
          pkg.triggerSources.includes(request.triggerSource),
        );

    const primary: SkillPackage[] = [];
    const fallbacks: SkillPackage[] = [];
    const blocked: SkillActivationResult["blocked"] = [];

    for (const skillPackage of requested) {
      if (supportsAllCapabilities(skillPackage, request)) {
        primary.push(skillPackage);
        continue;
      }

      blocked.push({
        skillId: skillPackage.id,
        reason: "missing harness capabilities",
      });

      const candidateFallbacks = skillPackage.fallbackSkills
        .map((fallbackId) =>
          skillPackages.find((candidate) => candidate.id === fallbackId),
        )
        .filter((candidate): candidate is SkillPackage => Boolean(candidate))
        .filter((candidate) => supportsAllCapabilities(candidate, request));

      fallbacks.push(...candidateFallbacks);
    }

    return {
      primary,
      fallbacks: Array.from(
        new Map(fallbacks.map((skillPackage) => [skillPackage.id, skillPackage])).values(),
      ),
      blocked,
    };
  }
}
