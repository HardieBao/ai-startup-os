import fs from "node:fs/promises";
import path from "node:path";
import { repoRoot, toRepoRelativePath } from "./repo-paths.mjs";
import { validateStateRecord } from "./state-validator.mjs";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export class StateWriter {
  constructor() {
    this.repoRoot = repoRoot;
    this.stateRoot = path.join(repoRoot, "state");
    this.workflowInstancesRoot = path.join(this.stateRoot, "workflow-instances");
    this.tasksRoot = path.join(this.stateRoot, "tasks");
    this.runsRoot = path.join(this.stateRoot, "runs");
    this.memoryRecordsRoot = path.join(this.stateRoot, "memory-records");
    this.decisionGatesRoot = path.join(this.stateRoot, "decision-gates");
    this.eventsRoot = path.join(this.stateRoot, "events");
  }

  workflowInstanceFile(workflowInstanceId) {
    return path.join(this.workflowInstancesRoot, `${workflowInstanceId}.json`);
  }

  taskDir(workflowInstanceId) {
    return path.join(this.tasksRoot, workflowInstanceId);
  }

  taskFile(workflowInstanceId, taskId) {
    return path.join(this.taskDir(workflowInstanceId), `${taskId}.json`);
  }

  runDir(workflowInstanceId) {
    return path.join(this.runsRoot, workflowInstanceId);
  }

  runFile(workflowInstanceId, runId) {
    return path.join(this.runDir(workflowInstanceId), `${runId}.json`);
  }

  memoryRecordDir(workflowInstanceId) {
    return path.join(this.memoryRecordsRoot, workflowInstanceId);
  }

  memoryRecordFile(workflowInstanceId, memoryRecordId) {
    return path.join(this.memoryRecordDir(workflowInstanceId), `${memoryRecordId}.json`);
  }

  decisionGateDir(workflowInstanceId) {
    return path.join(this.decisionGatesRoot, workflowInstanceId);
  }

  decisionGateFile(workflowInstanceId, decisionGateId) {
    return path.join(this.decisionGateDir(workflowInstanceId), `${decisionGateId}.json`);
  }

  eventsFile(workflowInstanceId) {
    return path.join(this.eventsRoot, `${workflowInstanceId}.jsonl`);
  }

  getPaths(workflowInstanceId) {
    const workflowInstanceFile = this.workflowInstanceFile(workflowInstanceId);
    const taskStateDir = this.taskDir(workflowInstanceId);
    const runStateDir = this.runDir(workflowInstanceId);
    const memoryRecordDir = this.memoryRecordDir(workflowInstanceId);
    const decisionGateDir = this.decisionGateDir(workflowInstanceId);
    const eventsFile = this.eventsFile(workflowInstanceId);

    return {
      workflowInstanceFile,
      taskStateDir,
      runStateDir,
      memoryRecordDir,
      decisionGateDir,
      eventsFile,
      relativeWorkflowInstanceFile: toRepoRelativePath(workflowInstanceFile),
      relativeTaskStateDir: toRepoRelativePath(taskStateDir),
      relativeRunStateDir: toRepoRelativePath(runStateDir),
      relativeMemoryRecordDir: toRepoRelativePath(memoryRecordDir),
      relativeDecisionGateDir: toRepoRelativePath(decisionGateDir),
      relativeEventsFile: toRepoRelativePath(eventsFile),
    };
  }

  async initialize(workflowInstanceId) {
    await ensureDir(this.workflowInstancesRoot);
    await ensureDir(this.taskDir(workflowInstanceId));
    await ensureDir(this.runDir(workflowInstanceId));
    await ensureDir(this.memoryRecordDir(workflowInstanceId));
    await ensureDir(this.decisionGateDir(workflowInstanceId));
    await ensureDir(this.eventsRoot);
  }

  async writeWorkflowInstance(record) {
    await validateStateRecord(record);
    await ensureDir(this.workflowInstancesRoot);
    const filePath = this.workflowInstanceFile(record.id);
    await writeJson(filePath, record);
    return filePath;
  }

  async writeTask(record) {
    await validateStateRecord(record);
    const dirPath = this.taskDir(record.workflowInstanceId);
    await ensureDir(dirPath);
    const filePath = this.taskFile(record.workflowInstanceId, record.id);
    await writeJson(filePath, record);
    return filePath;
  }

  async writeRun(record) {
    await validateStateRecord(record);
    const dirPath = this.runDir(record.workflowInstanceId);
    await ensureDir(dirPath);
    const filePath = this.runFile(record.workflowInstanceId, record.id);
    await writeJson(filePath, record);
    return filePath;
  }

  async writeMemoryRecord(record) {
    await validateStateRecord(record);
    const dirPath = this.memoryRecordDir(record.workflowInstanceId);
    await ensureDir(dirPath);
    const filePath = this.memoryRecordFile(record.workflowInstanceId, record.id);
    await writeJson(filePath, record);
    return filePath;
  }

  async writeDecisionGate(record) {
    await validateStateRecord(record);
    const dirPath = this.decisionGateDir(record.workflowInstanceId);
    await ensureDir(dirPath);
    const filePath = this.decisionGateFile(record.workflowInstanceId, record.id);
    await writeJson(filePath, record);
    return filePath;
  }

  async appendEvent(record) {
    await validateStateRecord(record);
    await ensureDir(this.eventsRoot);
    const filePath = this.eventsFile(record.workflowInstanceId);
    await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
    return filePath;
  }
}
