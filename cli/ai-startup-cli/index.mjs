#!/usr/bin/env node

import { printUsage } from "../../src/runtime/formatting.mjs";
import {
  findLatestWorkflowInstanceId,
  inspectWorkflowInstance,
  printWorkflowInstanceInspection,
} from "../../src/runtime/inspect-workflow-instance.mjs";
import { simulateIdea, simulateWorkflow } from "../../src/runtime/workflow-runtime.mjs";

async function inspectWorkflowInstanceCommand(workflowInstanceId) {
  const view = await inspectWorkflowInstance({ workflowInstanceId });
  printWorkflowInstanceInspection(view);
}

async function inspectLatestWorkflowInstanceCommand(workflowId) {
  const workflowInstanceId = await findLatestWorkflowInstanceId({ workflowId });
  if (!workflowInstanceId) {
    throw new Error(`No workflow instances found for workflow: ${workflowId}`);
  }

  const view = await inspectWorkflowInstance({ workflowInstanceId });
  printWorkflowInstanceInspection(view);
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "new") {
    const idea = args.join(" ").trim();
    if (!idea) {
      console.error("Missing idea text.");
      printUsage();
      process.exitCode = 1;
      return;
    }
    await simulateIdea(idea);
    return;
  }

  if (command === "run") {
    const workflowId = args[0];
    const goal = args.slice(1).join(" ").trim();
    if (!workflowId) {
      console.error("Missing workflow id.");
      printUsage();
      process.exitCode = 1;
      return;
    }
    await simulateWorkflow(workflowId, goal);
    return;
  }

  if (command === "inspect") {
    const workflowInstanceId = args[0];
    if (!workflowInstanceId) {
      console.error("Missing workflow instance id.");
      printUsage();
      process.exitCode = 1;
      return;
    }
    await inspectWorkflowInstanceCommand(workflowInstanceId);
    return;
  }

  if (command === "inspect-latest") {
    const workflowId = args[0];
    if (!workflowId) {
      console.error("Missing workflow id.");
      printUsage();
      process.exitCode = 1;
      return;
    }
    await inspectLatestWorkflowInstanceCommand(workflowId);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
