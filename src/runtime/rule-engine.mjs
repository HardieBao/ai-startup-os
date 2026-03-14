function normalizeBoolean(value) {
  return value === true || value === "true";
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isRuleActive(company, ruleId) {
  return new Set(company.rules ?? []).has(ruleId);
}

function validateInstalledRule(installedRuleIds, ruleId) {
  if (!installedRuleIds.has(ruleId)) {
    throw new Error(`Active company rule is not installed: ${ruleId}`);
  }
}

function evaluateValidationChecks(input) {
  const {
    company,
    availableRules,
    agent,
    task,
    workflow,
    agents,
  } = input;

  const activeRuleIds = new Set(company.rules ?? []);
  const installedRuleIds = new Set((availableRules ?? []).map((rule) => rule.id));
  const checks = [];

  function addCheck(ruleId, passed, detail) {
    if (!activeRuleIds.has(ruleId)) {
      return;
    }
    validateInstalledRule(installedRuleIds, ruleId);
    checks.push({ ruleId, passed, detail });
  }

  addCheck(
    "workflow-step-agent-must-be-company-agent",
    (company.default_agents ?? []).includes(task.agentId),
    `Agent ${task.agentId} must belong to company ${company.id}`,
  );

  addCheck(
    "agent-must-have-skill",
    (agent.skills ?? []).includes(task.skillId),
    `Agent ${task.agentId} must declare skill ${task.skillId}`,
  );

  const allowedSkillIds = new Set(
    (company.default_agents ?? []).flatMap((agentId) => agents[agentId]?.skills ?? []),
  );
  addCheck(
    "workflow-step-skill-must-be-allowed",
    allowedSkillIds.has(task.skillId),
    `Skill ${task.skillId} must be allowed by company ${company.id}`,
  );

  addCheck(
    "company-must-own-agents",
    (company.default_agents ?? []).length > 0,
    `Company ${company.id} must declare at least one agent before running workflow ${workflow.id}`,
  );

  return checks;
}

function matchesStepPolicy(rule, task) {
  if (!rule?.action || rule.kind !== "policy") {
    return false;
  }
  if (rule.when_step_id && rule.when_step_id !== task.stepId) {
    return false;
  }
  return true;
}

function buildGatePolicy(rule) {
  return {
    ruleId: rule.id,
    action: "require_gate",
    gateType: rule.gate_type,
    approverRole: rule.approver_role,
    autoApprove: normalizeBoolean(rule.auto_approve),
  };
}

function buildRetryPolicy(rule) {
  return {
    ruleId: rule.id,
    action: "retry",
    maxAttempts: Math.max(normalizeInteger(rule.max_attempts, 1), 1),
  };
}

function buildHandoffPolicy(rule) {
  return {
    ruleId: rule.id,
    action: "handoff",
    handoffMode: rule.handoff_mode ?? "before_step",
    handoffAgentId: rule.handoff_agent_id,
  };
}

export function evaluateStepRules(input) {
  const { company, availableRules, task } = input;
  const activeRuleIds = new Set(company.rules ?? []);
  const installedRules = (availableRules ?? []).filter((rule) => activeRuleIds.has(rule.id));
  const installedRuleIds = new Set(installedRules.map((rule) => rule.id));

  for (const ruleId of activeRuleIds) {
    validateInstalledRule(installedRuleIds, ruleId);
  }

  const checks = evaluateValidationChecks(input);
  const failures = checks.filter((check) => !check.passed);

  const policies = {
    gates: [],
    retry: null,
    handoff: null,
  };

  for (const rule of installedRules) {
    if (!matchesStepPolicy(rule, task)) {
      continue;
    }

    if (rule.action === "require_gate") {
      policies.gates.push(buildGatePolicy(rule));
      continue;
    }

    if (rule.action === "retry") {
      const retryPolicy = buildRetryPolicy(rule);
      if (!policies.retry || retryPolicy.maxAttempts > policies.retry.maxAttempts) {
        policies.retry = retryPolicy;
      }
      continue;
    }

    if (rule.action === "handoff") {
      policies.handoff = buildHandoffPolicy(rule);
    }
  }

  return {
    checks,
    ok: failures.length === 0,
    failures,
    policies,
  };
}
