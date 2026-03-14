import fs from "node:fs/promises";
import path from "node:path";
import { executeRun } from "./run-executor.mjs";
import { printHeader } from "./formatting.mjs";
import { formatExecutionChain, loadSystemData } from "./repo-loader.mjs";
import { repoRoot, sanitizeTimestamp, slugify, toRepoRelativePath } from "./repo-paths.mjs";
import { evaluateStepRules } from "./rule-engine.mjs";
import { StateWriter } from "./state-writer.mjs";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function createErrorRecord(error) {
  if (error instanceof Error) {
    const record = {
      name: error.name,
      message: error.message,
    };

    if (typeof error.stack === "string") {
      record.stack = error.stack;
    }

    return record;
  }

  return {
    name: "Error",
    message: String(error),
  };
}

function countByStatus(items, statuses) {
  return items.filter((item) => statuses.includes(item.status)).length;
}

function buildWorkflowStats(tasks, runs) {
  return {
    totalTasks: tasks.length,
    pendingTasks: countByStatus(tasks, ["pending"]),
    readyTasks: countByStatus(tasks, ["ready"]),
    inProgressTasks: countByStatus(tasks, ["in_progress"]),
    doneTasks: countByStatus(tasks, ["done"]),
    blockedTasks: countByStatus(tasks, ["blocked"]),
    totalRuns: runs.length,
    queuedRuns: countByStatus(runs, ["queued"]),
    runningRuns: countByStatus(runs, ["running"]),
    succeededRuns: countByStatus(runs, ["succeeded"]),
    failedRuns: countByStatus(runs, ["failed"]),
  };
}

function createInitialTaskRecord({
  workflow,
  workflowInstanceId,
  task,
  sequence,
  dependsOnTaskIds,
  createdAt,
}) {
  return {
    kind: "task",
    schemaVersion: "1.0.0",
    id: task.id,
    workflowId: workflow.id,
    workflowInstanceId,
    sequence,
    stepId: task.stepId,
    agentId: task.agentId,
    skillId: task.skillId,
    artifactName: task.artifactName,
    status: task.status,
    dependsOnTaskIds,
    runIds: [],
    checkoutRunId: null,
    executionRunId: null,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    completedAt: null,
    artifactFile: null,
    error: null,
  };
}

function createRunRecord({
  workflow,
  workflowInstanceId,
  task,
  runId,
  createdAt,
  attempt = 1,
}) {
  return {
    kind: "run",
    schemaVersion: "1.0.0",
    id: runId,
    workflowId: workflow.id,
    workflowInstanceId,
    taskId: task.id,
    stepId: task.stepId,
    agentId: task.agentId,
    skillId: task.skillId,
    artifactName: task.artifactName,
    attempt,
    triggerSource: "workflow_step",
    status: "queued",
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    completedAt: null,
    artifactFile: null,
    error: null,
  };
}

function createWorkflowInstanceRecord({
  workflow,
  workflowInstanceId,
  idea,
  company,
  createdAt,
  storage,
  taskRecords,
  runRecords,
}) {
  return {
    kind: "workflow-instance",
    schemaVersion: "1.0.0",
    id: workflowInstanceId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    goal: {
      summary: idea,
      companyId: company.id,
      companyName: company.name,
      ruleIds: company.rules ?? [],
    },
    status: "pending",
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    completedAt: null,
    currentStepId: taskRecords[0]?.stepId ?? null,
    taskIds: taskRecords.map((task) => task.id),
    runIds: runRecords.map((run) => run.id),
    storage,
    stats: buildWorkflowStats(taskRecords, runRecords),
    error: null,
  };
}

function createMemoryRecord({
  workflow,
  workflowInstanceId,
  task,
  run,
  summary,
  createdAt,
  artifactFile,
}) {
  return {
    kind: "memory-record",
    schemaVersion: "1.0.0",
    id: `${workflowInstanceId}-memory-${task.sequence}`,
    workflowId: workflow.id,
    workflowInstanceId,
    scope: "project",
    namespace: workflow.id,
    summary,
    tags: [workflow.id, task.stepId, task.skillId, task.agentId],
    taskId: task.id,
    runId: run.id,
    artifactFile,
    createdAt,
  };
}

function createDecisionGateRecord({
  workflow,
  workflowInstanceId,
  task,
  gateId,
  gatePolicy,
  createdAt,
}) {
  return {
    kind: "decision-gate",
    schemaVersion: "1.0.0",
    id: gateId,
    workflowId: workflow.id,
    workflowInstanceId,
    type: gatePolicy.gateType,
    targetType: "task",
    targetId: task.id,
    requestedByAgentId: task.agentId,
    approverRole: gatePolicy.approverRole,
    status: "pending",
    autoApprove: gatePolicy.autoApprove === true,
    createdAt,
    updatedAt: createdAt,
    decidedAt: null,
    payload: {
      stepId: task.stepId,
      skillId: task.skillId,
      artifactName: task.artifactName,
    },
  };
}

function createEventRecord({
  workflow,
  workflowInstanceId,
  entityType,
  entityId,
  eventType,
  timestamp,
  payload,
}) {
  return {
    kind: "event",
    schemaVersion: "1.0.0",
    id: `${entityType}-${entityId}-${slugify(eventType)}-${sanitizeTimestamp(timestamp)}`,
    workflowId: workflow.id,
    workflowInstanceId,
    entityType,
    entityId,
    eventType,
    timestamp,
    payload,
  };
}

async function appendEvent(stateWriter, eventInput) {
  const eventRecord = createEventRecord(eventInput);
  await stateWriter.appendEvent(eventRecord);
  return eventRecord;
}

function buildRuleEvaluationSummary(ruleEvaluation) {
  return {
    passedChecks: ruleEvaluation.checks.filter((check) => check.passed).length,
    failedChecks: ruleEvaluation.failures.length,
    gatePolicies: ruleEvaluation.policies.gates.length,
    retryEnabled: Boolean(ruleEvaluation.policies.retry),
    handoffEnabled: Boolean(ruleEvaluation.policies.handoff),
  };
}

function applyTaskHandoff(task, taskRecord, handoffPolicy, agents) {
  if (!handoffPolicy || handoffPolicy.handoffMode !== "before_step") {
    return null;
  }

  const targetAgent = agents[handoffPolicy.handoffAgentId];
  if (!targetAgent) {
    throw new Error(`Handoff target agent is not installed: ${handoffPolicy.handoffAgentId}`);
  }
  if (!(targetAgent.skills ?? []).includes(task.skillId)) {
    throw new Error(`Handoff target agent ${handoffPolicy.handoffAgentId} cannot execute skill ${task.skillId}`);
  }

  const previousAgentId = task.agentId;
  task.agentId = handoffPolicy.handoffAgentId;
  taskRecord.agentId = handoffPolicy.handoffAgentId;

  return {
    previousAgentId,
    nextAgentId: handoffPolicy.handoffAgentId,
    ruleId: handoffPolicy.ruleId,
  };
}

async function materializeDecisionGates({
  workflow,
  workflowInstanceId,
  task,
  taskRecord,
  stateWriter,
  decisionGates,
  gatePolicies,
}) {
  for (const gatePolicy of gatePolicies) {
    const gateCreatedAt = new Date().toISOString();
    const gateId = `${task.id}-${gatePolicy.gateType}`;
    const decisionGate = createDecisionGateRecord({
      workflow,
      workflowInstanceId,
      task,
      gateId,
      gatePolicy,
      createdAt: gateCreatedAt,
    });

    decisionGates.push(decisionGate);
    await stateWriter.writeDecisionGate(decisionGate);
    await appendEvent(stateWriter, {
      workflow,
      workflowInstanceId,
      entityType: "workflow-instance",
      entityId: workflowInstanceId,
      eventType: "decision-gate.created",
      timestamp: gateCreatedAt,
      payload: {
        gateId: decisionGate.id,
        gateType: decisionGate.type,
        targetTaskId: task.id,
        approverRole: decisionGate.approverRole,
        ruleId: gatePolicy.ruleId,
      },
    });

    if (decisionGate.autoApprove) {
      const approvedAt = new Date().toISOString();
      decisionGate.status = "approved";
      decisionGate.updatedAt = approvedAt;
      decisionGate.decidedAt = approvedAt;
      await stateWriter.writeDecisionGate(decisionGate);
      await appendEvent(stateWriter, {
        workflow,
        workflowInstanceId,
        entityType: "workflow-instance",
        entityId: workflowInstanceId,
        eventType: "decision-gate.approved",
        timestamp: approvedAt,
        payload: {
          gateId: decisionGate.id,
          gateType: decisionGate.type,
          targetTaskId: task.id,
          approverRole: decisionGate.approverRole,
          autoApproved: true,
          ruleId: gatePolicy.ruleId,
        },
      });
      continue;
    }

    taskRecord.status = "blocked";
    taskRecord.updatedAt = gateCreatedAt;
    await stateWriter.writeTask(taskRecord);
    throw new Error(`Decision gate ${decisionGate.id} is pending manual approval.`);
  }
}

async function persistTaskStates(stateWriter, taskRecords) {
  await Promise.all(taskRecords.map((task) => stateWriter.writeTask(task)));
}

async function persistMemoryStates(stateWriter, memoryRecords) {
  await Promise.all(memoryRecords.map((record) => stateWriter.writeMemoryRecord(record)));
}

async function persistWorkflowState(stateWriter, workflowState, taskRecords, runRecords) {
  workflowState.taskIds = taskRecords.map((task) => task.id);
  workflowState.runIds = runRecords.map((run) => run.id);
  workflowState.stats = buildWorkflowStats(taskRecords, runRecords);
  workflowState.updatedAt = new Date().toISOString();
  await stateWriter.writeWorkflowInstance(workflowState);
}

async function writeRunArtifacts(input) {
  const {
    workflow,
    workflowInstanceId,
    tasks,
    results,
    memoryRecords,
  } = input;

  const resultDir = path.join(repoRoot, "tasks", "results", workflowInstanceId);
  const queueDir = path.join(repoRoot, "tasks", "queue");
  const logsDir = path.join(repoRoot, "tasks", "logs");
  const memoryProjectsDir = path.join(repoRoot, "memory", "projects");

  await ensureDir(resultDir);
  await ensureDir(queueDir);
  await ensureDir(logsDir);
  await ensureDir(memoryProjectsDir);

  await fs.writeFile(
    path.join(queueDir, `${workflowInstanceId}.json`),
    JSON.stringify(
      {
        workflowId: workflow.id,
        workflowInstanceId,
        tasks,
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const result of results) {
    await fs.writeFile(
      path.join(resultDir, `${result.sequence.toString().padStart(2, "0")}-${result.stepId}.md`),
      result.content,
      "utf8",
    );
  }

  await fs.writeFile(
    path.join(resultDir, "summary.json"),
    JSON.stringify(
      {
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowInstanceId,
        completedTasks: tasks.length,
        results: results.map((result) => ({
          taskId: result.taskId,
          stepId: result.stepId,
          agentId: result.agentId,
          skillId: result.skillId,
          artifactName: result.artifactName,
          file: result.fileName,
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  await fs.writeFile(
    path.join(logsDir, `${workflowInstanceId}.log`),
    results
      .map(
        (result) =>
          `[${result.sequence}] ${result.taskId} | ${result.agentId} | ${result.skillId} | ${result.artifactName}`,
      )
      .join("\n"),
    "utf8",
  );

  await fs.writeFile(
    path.join(memoryProjectsDir, `${workflowInstanceId}.json`),
    JSON.stringify(memoryRecords, null, 2),
    "utf8",
  );

  return {
    resultDir,
    memoryFile: path.join(memoryProjectsDir, `${workflowInstanceId}.json`),
  };
}

export async function simulateIdea(idea) {
  const { company, agents, workflow } = await loadSystemData("build-product");

  printHeader("AI STARTUP OS DEMO: NEW IDEA");
  console.log(`Idea: ${idea}`);
  console.log("");
  console.log("System interpretation:");
  console.log(`- Company: ${company.name}`);
  console.log(`- Goal type: ${workflow.goal}`);
  console.log(`- Recommended workflow: ${workflow.id}`);
  console.log(`- Active rules: ${(company.rules ?? []).join(", ") || "none"}`);
  console.log("- Assigned execution chain:");
  console.log(`  ${formatExecutionChain(workflow, agents)}`);
  console.log("");
  console.log("Expected outputs:");
  for (const step of workflow.steps) {
    console.log(`- ${step.output}`);
  }
  console.log("");
  console.log("Run next:");
  console.log(`  node cli/ai-startup-cli/index.mjs run ${workflow.id} "${idea}"`);
}

export async function simulateWorkflow(workflowId, goalOverride) {
  const { company, agents, skills, rules, workflow } = await loadSystemData(workflowId);
  const now = new Date();
  const createdAt = now.toISOString();
  const workflowInstanceId = `${workflowId}-${sanitizeTimestamp(createdAt)}`;
  const idea = goalOverride?.trim() || workflow.goal || "Repository-backed workflow demo";
  const stateWriter = new StateWriter();
  await stateWriter.initialize(workflowInstanceId);
  const statePaths = stateWriter.getPaths(workflowInstanceId);

  const tasks = workflow.steps.map((step, index) => ({
    id: `${workflowId}-task-${index + 1}`,
    stepId: step.id,
    agentId: step.agent,
    skillId: step.skill,
    artifactName: step.output,
    status: index === 0 ? "ready" : "pending",
  }));

  const taskRecords = tasks.map((task, index) =>
    createInitialTaskRecord({
      workflow,
      workflowInstanceId,
      task,
      sequence: index + 1,
      dependsOnTaskIds: index > 0 ? [tasks[index - 1].id] : [],
      createdAt,
    }),
  );
  const runRecords = [];
  const memoryRecords = [];
  const decisionGates = [];

  const workflowState = createWorkflowInstanceRecord({
    workflow,
    workflowInstanceId,
    idea,
    company,
    createdAt,
    storage: {
      resultDir: toRepoRelativePath(path.join(repoRoot, "tasks", "results", workflowInstanceId)),
      logFile: toRepoRelativePath(path.join(repoRoot, "tasks", "logs", `${workflowInstanceId}.log`)),
      queueFile: toRepoRelativePath(path.join(repoRoot, "tasks", "queue", `${workflowInstanceId}.json`)),
      aggregateMemoryFile: toRepoRelativePath(path.join(repoRoot, "memory", "projects", `${workflowInstanceId}.json`)),
      taskStateDir: statePaths.relativeTaskStateDir,
      runStateDir: statePaths.relativeRunStateDir,
      memoryRecordDir: statePaths.relativeMemoryRecordDir,
      decisionGateDir: statePaths.relativeDecisionGateDir,
      eventsFile: statePaths.relativeEventsFile,
    },
    taskRecords,
    runRecords,
  });

  await persistTaskStates(stateWriter, taskRecords);
  await persistWorkflowState(stateWriter, workflowState, taskRecords, runRecords);
  await appendEvent(stateWriter, {
    workflow,
    workflowInstanceId,
    entityType: "workflow-instance",
    entityId: workflowInstanceId,
    eventType: "workflow.initialized",
    timestamp: createdAt,
    payload: {
      status: workflowState.status,
      totalTasks: taskRecords.length,
    },
  });
  await appendEvent(stateWriter, {
    workflow,
    workflowInstanceId,
    entityType: "workflow-instance",
    entityId: workflowInstanceId,
    eventType: "company.created",
    timestamp: createdAt,
    payload: {
      companyId: company.id,
      companyName: company.name,
    },
  });
  await appendEvent(stateWriter, {
    workflow,
    workflowInstanceId,
    entityType: "workflow-instance",
    entityId: workflowInstanceId,
    eventType: "company.agents-loaded",
    timestamp: createdAt,
    payload: {
      agentIds: company.default_agents ?? [],
      totalAgents: (company.default_agents ?? []).length,
    },
  });
  await appendEvent(stateWriter, {
    workflow,
    workflowInstanceId,
    entityType: "workflow-instance",
    entityId: workflowInstanceId,
    eventType: "company.skills-loaded",
    timestamp: createdAt,
    payload: {
      totalSkills: Object.keys(skills).length,
    },
  });
  await appendEvent(stateWriter, {
    workflow,
    workflowInstanceId,
    entityType: "workflow-instance",
    entityId: workflowInstanceId,
    eventType: "company.rules-loaded",
    timestamp: createdAt,
    payload: {
      ruleIds: (rules ?? []).map((rule) => rule.id),
      activeRuleIds: company.rules ?? [],
    },
  });
  for (const taskRecord of taskRecords) {
    await appendEvent(stateWriter, {
      workflow,
      workflowInstanceId,
      entityType: "task",
      entityId: taskRecord.id,
      eventType: "task.materialized",
      timestamp: createdAt,
      payload: {
        status: taskRecord.status,
        sequence: taskRecord.sequence,
        dependsOnTaskIds: taskRecord.dependsOnTaskIds,
      },
    });
  }

  printHeader(`AI STARTUP OS DEMO: ${workflow.name.toUpperCase()}`);
  console.log(`Company: ${company.name} (${company.id})`);
  console.log("Control chain: create company -> load agents -> load skills -> load rules -> run workflow");
  console.log(`Workflow ID: ${workflow.id}`);
  console.log(`Workflow Instance: ${workflowInstanceId}`);
  console.log(`Input goal: ${idea}`);
  console.log(`Active rules: ${(company.rules ?? []).join(", ") || "none"}`);
  console.log("");
  console.log("Materialized tasks:");
  for (const task of tasks) {
    const agent = agents[task.agentId];
    console.log(
      `- ${task.id} | ${task.status.padEnd(7)} | ${agent.title.padEnd(16)} | ${task.skillId} -> ${task.artifactName}`,
    );
  }

  console.log("");
  console.log("Simulated execution trace:");
  console.log("");

  const results = [];

  try {
    workflowState.status = "active";
    workflowState.startedAt = createdAt;
    await persistWorkflowState(stateWriter, workflowState, taskRecords, runRecords);
    await appendEvent(stateWriter, {
      workflow,
      workflowInstanceId,
      entityType: "workflow-instance",
      entityId: workflowInstanceId,
      eventType: "workflow.started",
      timestamp: createdAt,
      payload: {
        status: workflowState.status,
      },
    });

    for (const [index, task] of tasks.entries()) {
      const taskRecord = taskRecords[index];
      const initialAgent = agents[task.agentId];
      let ruleEvaluation = evaluateStepRules({
        company,
        availableRules: rules,
        agents,
        agent: initialAgent,
        task,
        workflow,
      });
      for (const check of ruleEvaluation.checks) {
        await appendEvent(stateWriter, {
          workflow,
          workflowInstanceId,
          entityType: "task",
          entityId: taskRecord.id,
          eventType: check.passed ? "rule.check-passed" : "rule.check-failed",
          timestamp: new Date().toISOString(),
          payload: {
            ruleId: check.ruleId,
            detail: check.detail,
            agentId: taskRecord.agentId,
            skillId: taskRecord.skillId,
          },
        });
      }
      if (!ruleEvaluation.ok) {
        throw new Error(
          `Runtime rule check failed for ${taskRecord.id}: ${ruleEvaluation.failures
            .map((failure) => `${failure.ruleId} (${failure.detail})`)
            .join(", ")}`,
        );
      }

      await appendEvent(stateWriter, {
        workflow,
        workflowInstanceId,
        entityType: "task",
        entityId: taskRecord.id,
        eventType: "rule.policy-evaluated",
        timestamp: new Date().toISOString(),
        payload: {
          summary: buildRuleEvaluationSummary(ruleEvaluation),
        },
      });

      const handoffRecord = applyTaskHandoff(task, taskRecord, ruleEvaluation.policies.handoff, agents);
      if (handoffRecord) {
        await appendEvent(stateWriter, {
          workflow,
          workflowInstanceId,
          entityType: "task",
          entityId: taskRecord.id,
          eventType: "task.handoff-applied",
          timestamp: new Date().toISOString(),
          payload: {
            ruleId: handoffRecord.ruleId,
            previousAgentId: handoffRecord.previousAgentId,
            nextAgentId: handoffRecord.nextAgentId,
          },
        });
        await stateWriter.writeTask(taskRecord);
        ruleEvaluation = evaluateStepRules({
          company,
          availableRules: rules,
          agents,
          agent: agents[task.agentId],
          task,
          workflow,
        });
      }

      await materializeDecisionGates({
        workflow,
        workflowInstanceId,
        task,
        taskRecord,
        stateWriter,
        decisionGates,
        gatePolicies: ruleEvaluation.policies.gates,
      });

      const agent = agents[task.agentId];
      const skill = skills[task.skillId];
      const maxAttempts = ruleEvaluation.policies.retry?.maxAttempts ?? 1;
      let runRecord;
      let content;
      let completedAt;
      let lastError = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const runId = `${task.id}-run-${attempt}`;
        const runCreatedAt = new Date().toISOString();
        const statusBefore = taskRecord.status;
        runRecord = createRunRecord({
          workflow,
          workflowInstanceId,
          task,
          runId,
          createdAt: runCreatedAt,
          attempt,
        });

        runRecords.push(runRecord);
        taskRecord.runIds.push(runId);
        taskRecord.checkoutRunId = runId;
        taskRecord.executionRunId = runId;
        taskRecord.status = "in_progress";
        taskRecord.startedAt ??= runCreatedAt;
        taskRecord.updatedAt = runCreatedAt;
        runRecord.status = "running";
        runRecord.startedAt = runCreatedAt;
        runRecord.updatedAt = runCreatedAt;
        workflowState.currentStepId = task.stepId;

        await stateWriter.writeRun(runRecord);
        await stateWriter.writeTask(taskRecord);
        await persistWorkflowState(stateWriter, workflowState, taskRecords, runRecords);
        await appendEvent(stateWriter, {
          workflow,
          workflowInstanceId,
          entityType: "run",
          entityId: runRecord.id,
          eventType: "run.queued",
          timestamp: runCreatedAt,
          payload: {
            status: "queued",
            taskId: taskRecord.id,
            agentId: taskRecord.agentId,
            skillId: taskRecord.skillId,
            attempt,
          },
        });
        await appendEvent(stateWriter, {
          workflow,
          workflowInstanceId,
          entityType: "run",
          entityId: runRecord.id,
          eventType: "run.started",
          timestamp: runCreatedAt,
          payload: {
            status: runRecord.status,
            taskId: taskRecord.id,
            attempt,
          },
        });
        await appendEvent(stateWriter, {
          workflow,
          workflowInstanceId,
          entityType: "task",
          entityId: taskRecord.id,
          eventType: "task.started",
          timestamp: runCreatedAt,
          payload: {
            previousStatus: statusBefore,
            status: taskRecord.status,
            runId,
            attempt,
          },
        });
        await appendEvent(stateWriter, {
          workflow,
          workflowInstanceId,
          entityType: "workflow-instance",
          entityId: workflowInstanceId,
          eventType: "workflow.step-entered",
          timestamp: runCreatedAt,
          payload: {
            stepId: task.stepId,
            taskId: taskRecord.id,
            runId,
            attempt,
          },
        });

        try {
          content = await executeRun({
            workflow,
            workflowInstanceId,
            task,
            agent,
            skill,
            idea,
            artifactName: task.artifactName,
            previousResults: results.map((result) => ({
              sequence: result.sequence,
              artifactName: result.artifactName,
              agentTitle: agents[result.agentId]?.title ?? result.agentId,
              skillTitle: skills[result.skillId]?.title ?? result.skillId,
            })),
          });
          completedAt = new Date().toISOString();
          lastError = null;
          break;
        } catch (error) {
          const failedAt = new Date().toISOString();
          const errorRecord = createErrorRecord(error);
          lastError = error;
          runRecord.status = "failed";
          runRecord.completedAt = failedAt;
          runRecord.updatedAt = failedAt;
          runRecord.error = errorRecord;
          await stateWriter.writeRun(runRecord);
          await appendEvent(stateWriter, {
            workflow,
            workflowInstanceId,
            entityType: "run",
            entityId: runRecord.id,
            eventType: "run.failed",
            timestamp: failedAt,
            payload: {
              status: runRecord.status,
              error: errorRecord,
              attempt,
            },
          });

          if (attempt < maxAttempts) {
            taskRecord.status = "ready";
            taskRecord.updatedAt = failedAt;
            taskRecord.error = errorRecord;
            await stateWriter.writeTask(taskRecord);
            await appendEvent(stateWriter, {
              workflow,
              workflowInstanceId,
              entityType: "task",
              entityId: taskRecord.id,
              eventType: "task.retry-scheduled",
              timestamp: failedAt,
              payload: {
                ruleId: ruleEvaluation.policies.retry?.ruleId ?? null,
                failedRunId: runRecord.id,
                nextAttempt: attempt + 1,
                maxAttempts,
              },
            });
            continue;
          }

          throw error;
        }
      }
      const fileName = `${String(index + 1).padStart(2, "0")}-${task.stepId}.md`;
      const artifactFile = toRepoRelativePath(path.join(repoRoot, "tasks", "results", workflowInstanceId, fileName));
      if (lastError) {
        throw lastError;
      }

      console.log(`[Step ${index + 1}] ${task.stepId}`);
      console.log(`  Agent: ${agent.title} (${agent.role})`);
      console.log(`  Skill: ${task.skillId}`);
      console.log(`  Task:  ${task.id}`);
      console.log(`  Run:   ${runRecord.id}`);
      console.log(`  Attempts: ${runRecord.attempt}/${maxAttempts}`);
      console.log(`  Status transition: ready -> in_progress -> done`);
      console.log(`  Produced artifact: ${task.artifactName}`);
      console.log("");

      results.push({
        sequence: index + 1,
        taskId: task.id,
        stepId: task.stepId,
        agentId: task.agentId,
        skillId: task.skillId,
        artifactName: task.artifactName,
        content,
        fileName,
      });

      taskRecord.status = "done";
      taskRecord.completedAt = completedAt;
      taskRecord.updatedAt = completedAt;
      taskRecord.artifactFile = artifactFile;
      runRecord.status = "succeeded";
      runRecord.completedAt = completedAt;
      runRecord.updatedAt = completedAt;
      runRecord.artifactFile = artifactFile;
      runRecord.error = null;
      taskRecord.error = null;

      const memoryRecord = createMemoryRecord({
        workflow,
        workflowInstanceId,
        task: taskRecord,
        run: runRecord,
        summary: `${agent.title} produced ${task.artifactName} using ${task.skillId}`,
        createdAt: completedAt,
        artifactFile,
      });
      memoryRecords.push(memoryRecord);

      const nextTask = taskRecords[index + 1];
      if (nextTask && nextTask.status === "pending") {
        nextTask.status = "ready";
        nextTask.updatedAt = completedAt;
      }

      await stateWriter.writeTask(taskRecord);
      await stateWriter.writeRun(runRecord);
      await stateWriter.writeMemoryRecord(memoryRecord);
      await appendEvent(stateWriter, {
        workflow,
        workflowInstanceId,
        entityType: "run",
        entityId: runRecord.id,
        eventType: "run.succeeded",
        timestamp: completedAt,
        payload: {
          status: runRecord.status,
          artifactFile,
        },
      });
      await appendEvent(stateWriter, {
        workflow,
        workflowInstanceId,
        entityType: "task",
        entityId: taskRecord.id,
        eventType: "task.completed",
        timestamp: completedAt,
        payload: {
          status: taskRecord.status,
          runId: runRecord.id,
          artifactFile,
        },
      });
      await appendEvent(stateWriter, {
        workflow,
        workflowInstanceId,
        entityType: "memory-record",
        entityId: memoryRecord.id,
        eventType: "memory-record.created",
        timestamp: completedAt,
        payload: {
          taskId: taskRecord.id,
          runId: runRecord.id,
          artifactFile,
        },
      });
      if (nextTask) {
        await stateWriter.writeTask(nextTask);
        await appendEvent(stateWriter, {
          workflow,
          workflowInstanceId,
          entityType: "task",
          entityId: nextTask.id,
          eventType: "task.ready",
          timestamp: completedAt,
          payload: {
            status: nextTask.status,
            unblockedByTaskId: taskRecord.id,
          },
        });
      }
      await persistWorkflowState(stateWriter, workflowState, taskRecords, runRecords);
    }
  } catch (error) {
    const failedAt = new Date().toISOString();
    const activeRun = [...runRecords].reverse().find((run) => run.status === "running" || run.status === "queued");
    const activeTask = activeRun
      ? taskRecords.find((task) => task.id === activeRun.taskId)
      : taskRecords.find((task) => task.status === "in_progress" || task.status === "ready");
    const errorRecord = createErrorRecord(error);

    if (activeRun) {
      activeRun.status = "failed";
      activeRun.updatedAt = failedAt;
      activeRun.completedAt = failedAt;
      activeRun.error = errorRecord;
      await stateWriter.writeRun(activeRun);
      await appendEvent(stateWriter, {
        workflow,
        workflowInstanceId,
        entityType: "run",
        entityId: activeRun.id,
        eventType: "run.failed",
        timestamp: failedAt,
        payload: {
          status: activeRun.status,
          error: errorRecord,
        },
      });
    }

    if (activeTask) {
      activeTask.status = "blocked";
      activeTask.updatedAt = failedAt;
      activeTask.error = errorRecord;
      await stateWriter.writeTask(activeTask);
      await appendEvent(stateWriter, {
        workflow,
        workflowInstanceId,
        entityType: "task",
        entityId: activeTask.id,
        eventType: "task.blocked",
        timestamp: failedAt,
        payload: {
          status: activeTask.status,
          error: errorRecord,
        },
      });
    }

    workflowState.status = "blocked";
    workflowState.updatedAt = failedAt;
    workflowState.error = errorRecord;
    await persistWorkflowState(stateWriter, workflowState, taskRecords, runRecords);
    await appendEvent(stateWriter, {
      workflow,
      workflowInstanceId,
      entityType: "workflow-instance",
      entityId: workflowInstanceId,
      eventType: "workflow.blocked",
      timestamp: failedAt,
      payload: {
        status: workflowState.status,
        error: errorRecord,
      },
    });

    throw error;
  }

  const completedAt = new Date().toISOString();
  workflowState.status = "completed";
  workflowState.completedAt = completedAt;
  workflowState.currentStepId = null;
  workflowState.error = null;
  await persistMemoryStates(stateWriter, memoryRecords);
  await persistWorkflowState(stateWriter, workflowState, taskRecords, runRecords);
  await appendEvent(stateWriter, {
    workflow,
    workflowInstanceId,
    entityType: "workflow-instance",
    entityId: workflowInstanceId,
    eventType: "workflow.completed",
    timestamp: completedAt,
    payload: {
      status: workflowState.status,
      completedTasks: taskRecords.filter((task) => task.status === "done").length,
      totalTasks: taskRecords.length,
    },
  });

  const persisted = await writeRunArtifacts({
    workflow,
    workflowInstanceId,
    tasks: taskRecords,
    results,
    memoryRecords,
  });

  console.log("Final summary:");
  console.log(`- Workflow completed: ${workflow.id}`);
  console.log(`- Company: ${company.name}`);
  console.log(`- Tasks completed: ${taskRecords.filter((task) => task.status === "done").length}/${taskRecords.length}`);
  console.log(`- Active rules enforced: ${(company.rules ?? []).length}`);
  console.log(`- Decision gates triggered: ${decisionGates.length}`);
  console.log(`- Memory records written: ${memoryRecords.length}`);
  console.log(`- Results directory: ${persisted.resultDir}`);
  console.log(`- Memory file: ${persisted.memoryFile}`);
  console.log(`- Workflow state: ${statePaths.relativeWorkflowInstanceFile}`);
  console.log(`- Task states: ${statePaths.relativeTaskStateDir}`);
  console.log(`- Run states: ${statePaths.relativeRunStateDir}`);
  console.log(`- Memory record states: ${statePaths.relativeMemoryRecordDir}`);
  console.log(`- Decision gate states: ${statePaths.relativeDecisionGateDir}`);
  console.log(`- Event log: ${statePaths.relativeEventsFile}`);
}
