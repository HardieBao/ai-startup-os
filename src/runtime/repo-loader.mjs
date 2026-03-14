import fs from "node:fs/promises";
import path from "node:path";
import { parseSimpleYamlMap, parseSkillMarkdown, parseWorkflowYaml } from "./parsers.mjs";
import { repoRoot, slugify } from "./repo-paths.mjs";

async function listFilesRecursively(baseDir, predicate) {
  const result = [];
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await listFilesRecursively(fullPath, predicate)));
      continue;
    }
    if (predicate(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

export async function loadAgents() {
  const agentFiles = await listFilesRecursively(
    path.join(repoRoot, "agents"),
    (filePath) => filePath.endsWith("agent.yaml"),
  );
  const records = await Promise.all(
    agentFiles.map(async (filePath) => {
      const content = await fs.readFile(filePath, "utf8");
      const parsed = parseSimpleYamlMap(content);
      return [parsed.id, { ...parsed, filePath }];
    }),
  );
  return Object.fromEntries(records);
}

export async function loadCompany() {
  const companyPath = path.join(repoRoot, "config", "company.yaml");
  const content = await fs.readFile(companyPath, "utf8");
  return {
    ...parseSimpleYamlMap(content),
    filePath: companyPath,
  };
}

export async function loadSkills() {
  const skillFiles = await listFilesRecursively(
    path.join(repoRoot, "skills"),
    (filePath) => filePath.endsWith(".md"),
  );
  const records = await Promise.all(
    skillFiles.map(async (filePath) => {
      const content = await fs.readFile(filePath, "utf8");
      const parsed = parseSkillMarkdown(content, filePath);
      return [parsed.id, parsed];
    }),
  );
  return Object.fromEntries(records);
}

export async function loadRules() {
  const rulesPath = path.join(repoRoot, "config", "rules.yaml");
  const content = await fs.readFile(rulesPath, "utf8");
  const parsed = parseSimpleYamlMap(content);
  const ruleIds = Array.isArray(parsed.rules) ? parsed.rules : [];

  const ruleConfig = ruleIds.map((entry) => {
    if (typeof entry !== "string") {
      return entry;
    }
    return { id: entry };
  });

  const lines = content.split(/\r?\n/);
  const detailedRules = [];
  let currentRule = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const ruleStart = line.match(/^\s*-\s+id:\s*(.+)$/);
    if (ruleStart) {
      currentRule = { id: ruleStart[1].trim() };
      detailedRules.push(currentRule);
      continue;
    }

    const nested = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.+)$/);
    if (nested && currentRule) {
      const [, key, value] = nested;
      currentRule[key] = value.trim();
    }
  }

  return detailedRules.length > 0 ? detailedRules : ruleConfig;
}

export async function loadWorkflow(workflowId, skills, agents) {
  const workflowDir = path.join(repoRoot, "workflows", workflowId);
  const workflowPath = path.join(workflowDir, "workflow.yaml");
  const workflowContent = await fs.readFile(workflowPath, "utf8");
  const parsedWorkflow = parseWorkflowYaml(workflowContent);

  const steps = [];
  for (let index = 0; index < parsedWorkflow.steps.length; index += 1) {
    const item = parsedWorkflow.steps[index];
    let step;
    if (typeof item === "string") {
      const stepPath = path.join(workflowDir, "steps", `${item}.yaml`);
      const stepContent = await fs.readFile(stepPath, "utf8");
      step = {
        id: item,
        ...parseSimpleYamlMap(stepContent),
      };
    } else {
      const skillId = item.skill;
      step = {
        id: item.id ?? `${workflowId}-step-${index + 1}`,
        ...item,
      };
      if (!step.output) {
        const skill = skills[skillId];
        step.output = skill?.outputs?.[0] ? slugify(skill.outputs[0]) : `${skillId}-result`;
      }
    }

    if (!agents[step.agent]) {
      throw new Error(`Workflow ${workflowId} references unknown agent: ${step.agent}`);
    }
    if (!skills[step.skill]) {
      throw new Error(`Workflow ${workflowId} references unknown skill: ${step.skill}`);
    }

    steps.push(step);
  }

  return {
    id: parsedWorkflow.id,
    name: parsedWorkflow.name,
    goal: parsedWorkflow.goal,
    steps,
  };
}

function validateCompanyShape(company) {
  if (!company?.id || !company?.name) {
    throw new Error("Company config must include id and name.");
  }
  if (!Array.isArray(company.default_agents) || company.default_agents.length === 0) {
    throw new Error("Company config must declare default_agents.");
  }
}

function normalizeRuleSet(input) {
  return Array.isArray(input) ? input.map((rule) => (typeof rule === "string" ? { id: rule } : rule)) : [];
}

function validateCompanyRuntime({ company, agents, skills, rules, workflow }) {
  const companyAgentIds = new Set(company.default_agents ?? []);
  const ruleIds = new Set(normalizeRuleSet(company.rules).map((rule) => rule.id));
  const availableRules = new Set(normalizeRuleSet(rules).map((rule) => rule.id));

  for (const ruleId of ruleIds) {
    if (!availableRules.has(ruleId)) {
      throw new Error(`Company references unknown rule: ${ruleId}`);
    }
  }

  for (const agentId of companyAgentIds) {
    if (!agents[agentId]) {
      throw new Error(`Company references unknown agent: ${agentId}`);
    }
  }

  const allowedSkillIds = new Set(
    [...companyAgentIds].flatMap((agentId) => agents[agentId]?.skills ?? []),
  );

  for (const step of workflow.steps) {
    if (ruleIds.has("workflow-step-agent-must-be-company-agent") && !companyAgentIds.has(step.agent)) {
      throw new Error(`Workflow ${workflow.id} uses agent outside company scope: ${step.agent}`);
    }

    if (ruleIds.has("workflow-step-skill-must-be-allowed") && !allowedSkillIds.has(step.skill)) {
      throw new Error(`Workflow ${workflow.id} uses skill outside company scope: ${step.skill}`);
    }

    if (ruleIds.has("agent-must-have-skill")) {
      const agent = agents[step.agent];
      const agentSkills = new Set(agent?.skills ?? []);
      if (!agentSkills.has(step.skill)) {
        throw new Error(`Agent ${step.agent} is not allowed to use skill ${step.skill}`);
      }
    }

    if (!skills[step.skill]) {
      throw new Error(`Workflow ${workflow.id} references unknown skill: ${step.skill}`);
    }
  }
}

export async function loadSystemData(workflowId) {
  const company = await loadCompany();
  validateCompanyShape(company);
  const agents = await loadAgents();
  const skills = await loadSkills();
  const rules = await loadRules();
  const resolvedWorkflowId = workflowId ?? company.default_workflow;
  const workflow = await loadWorkflow(resolvedWorkflowId, skills, agents);
  validateCompanyRuntime({ company, agents, skills, rules, workflow });
  return { company, agents, skills, rules, workflow };
}

export function formatExecutionChain(workflow, agents) {
  return workflow.steps
    .map((step) => agents[step.agent]?.title ?? step.agent)
    .join(" -> ");
}
