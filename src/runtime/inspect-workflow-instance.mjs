import fs from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./repo-paths.mjs";

async function readJson(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readWorkflowInstanceMetadata(filePath) {
  try {
    const [workflowInstance, stats] = await Promise.all([readJson(filePath), fs.stat(filePath)]);
    return {
      id: workflowInstance.id,
      workflowId: workflowInstance.workflowId,
      createdAt:
        workflowInstance.createdAt ??
        workflowInstance.startedAt ??
        workflowInstance.updatedAt ??
        stats.mtime.toISOString(),
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readJsonDir(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(dirPath, entry.name))
      .sort();
    return Promise.all(files.map((filePath) => readJson(filePath)));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function readEventsFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function relativePath(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

function summarizeEvents(events) {
  const counters = new Map();
  for (const event of events) {
    counters.set(event.eventType, (counters.get(event.eventType) ?? 0) + 1);
  }
  return Array.from(counters.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([eventType, count]) => ({ eventType, count }));
}

function buildTimeline(events) {
  return events.map((event, index) => ({
    sequence: index + 1,
    timestamp: event.timestamp,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload,
  }));
}

function buildTaskSummaries(tasks, runs) {
  const runsByTaskId = new Map();
  for (const run of runs) {
    const list = runsByTaskId.get(run.taskId) ?? [];
    list.push(run);
    runsByTaskId.set(run.taskId, list);
  }

  return [...tasks]
    .sort((left, right) => left.sequence - right.sequence)
    .map((task) => ({
      id: task.id,
      sequence: task.sequence,
      stepId: task.stepId,
      agentId: task.agentId,
      skillId: task.skillId,
      status: task.status,
      artifactName: task.artifactName,
      artifactFile: task.artifactFile,
      dependsOnTaskIds: task.dependsOnTaskIds,
      runIds: task.runIds,
      runs: (runsByTaskId.get(task.id) ?? []).sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    }));
}

export async function inspectWorkflowInstance({ workflowInstanceId }) {
  const workflowInstancePath = path.join(repoRoot, "state", "workflow-instances", `${workflowInstanceId}.json`);
  const workflowInstance = await readJsonIfExists(workflowInstancePath);

  if (!workflowInstance) {
    throw new Error(`Workflow instance not found: ${workflowInstanceId}`);
  }

  const tasksDir = path.join(repoRoot, "state", "tasks", workflowInstanceId);
  const runsDir = path.join(repoRoot, "state", "runs", workflowInstanceId);
  const memoryRecordsDir = path.join(repoRoot, "state", "memory-records", workflowInstanceId);
  const decisionGatesDir = path.join(repoRoot, "state", "decision-gates", workflowInstanceId);
  const eventsFile = path.join(repoRoot, "state", "events", `${workflowInstanceId}.jsonl`);

  const [tasks, runs, memoryRecords, decisionGates, events] = await Promise.all([
    readJsonDir(tasksDir),
    readJsonDir(runsDir),
    readJsonDir(memoryRecordsDir),
    readJsonDir(decisionGatesDir),
    readEventsFile(eventsFile),
  ]);

  const taskSummaries = buildTaskSummaries(tasks, runs);
  const eventSummary = summarizeEvents(events);
  const timeline = buildTimeline(events);

  return {
    workflowInstance,
    storage: {
      workflowInstanceFile: relativePath(workflowInstancePath),
      tasksDir: relativePath(tasksDir),
      runsDir: relativePath(runsDir),
      memoryRecordsDir: relativePath(memoryRecordsDir),
      decisionGatesDir: relativePath(decisionGatesDir),
      eventsFile: relativePath(eventsFile),
    },
    stats: {
      totalTasks: tasks.length,
      totalRuns: runs.length,
      totalMemoryRecords: memoryRecords.length,
      totalDecisionGates: decisionGates.length,
      totalEvents: events.length,
    },
    tasks: taskSummaries,
    runs: [...runs].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    memoryRecords: [...memoryRecords].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    decisionGates: [...decisionGates].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    eventSummary,
    timeline,
  };
}

export async function findLatestWorkflowInstanceId({ workflowId }) {
  const workflowInstancesDir = path.join(repoRoot, "state", "workflow-instances");
  let entries;

  try {
    entries = await fs.readdir(workflowInstancesDir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const candidateFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .filter((entry) => entry.name.startsWith(`${workflowId}-`))
    .map((entry) => path.join(workflowInstancesDir, entry.name));

  const candidates = (await Promise.all(candidateFiles.map((filePath) => readWorkflowInstanceMetadata(filePath))))
    .filter(Boolean)
    .sort((left, right) => {
      const timestampOrder = right.createdAt.localeCompare(left.createdAt);
      if (timestampOrder !== 0) {
        return timestampOrder;
      }
      return right.id.localeCompare(left.id);
    });

  return candidates[0]?.id ?? null;
}

export function printWorkflowInstanceInspection(view) {
  const { workflowInstance, storage, stats, tasks, decisionGates, eventSummary, timeline } = view;

  console.log("");
  console.log("=".repeat(72));
  console.log(`WORKFLOW INSTANCE INSPECT: ${workflowInstance.id}`);
  console.log("=".repeat(72));
  console.log(`Workflow: ${workflowInstance.workflowName} (${workflowInstance.workflowId})`);
  console.log(`Status:   ${workflowInstance.status}`);
  console.log(`Goal:     ${workflowInstance.goal.summary}`);
  console.log(`Started:  ${workflowInstance.startedAt ?? "n/a"}`);
  console.log(`Ended:    ${workflowInstance.completedAt ?? "n/a"}`);
  console.log("");
  console.log("Storage:");
  console.log(`- Workflow state: ${storage.workflowInstanceFile}`);
  console.log(`- Task states:    ${storage.tasksDir}`);
  console.log(`- Run states:     ${storage.runsDir}`);
  console.log(`- Memory states:  ${storage.memoryRecordsDir}`);
  console.log(`- Gate states:    ${storage.decisionGatesDir}`);
  console.log(`- Event log:      ${storage.eventsFile}`);
  console.log("");
  console.log("Aggregate:");
  console.log(`- Tasks:          ${stats.totalTasks}`);
  console.log(`- Runs:           ${stats.totalRuns}`);
  console.log(`- Memory records: ${stats.totalMemoryRecords}`);
  console.log(`- Decision gates: ${stats.totalDecisionGates}`);
  console.log(`- Events:         ${stats.totalEvents}`);
  console.log("");
  console.log("Tasks:");
  for (const task of tasks) {
    console.log(
      `- [${String(task.sequence).padStart(2, "0")}] ${task.stepId} | ${task.status.padEnd(11)} | ${task.agentId} | ${task.skillId}`,
    );
    console.log(`  Artifact: ${task.artifactName}${task.artifactFile ? ` -> ${task.artifactFile}` : ""}`);
    console.log(`  Runs: ${task.runs.map((run) => `${run.id}:${run.status}`).join(", ") || "none"}`);
  }
  console.log("");
  if (decisionGates.length > 0) {
    console.log("Decision Gates:");
    for (const gate of decisionGates) {
      console.log(`- ${gate.id} | ${gate.type} | ${gate.status} | approver=${gate.approverRole}`);
    }
    console.log("");
  }
  console.log("Event Summary:");
  for (const item of eventSummary) {
    console.log(`- ${item.eventType}: ${item.count}`);
  }
  console.log("");
  console.log("Timeline:");
  for (const entry of timeline) {
    console.log(
      `- [${String(entry.sequence).padStart(2, "0")}] ${entry.timestamp} | ${entry.eventType} | ${entry.entityType} | ${entry.entityId}`,
    );
  }
}
