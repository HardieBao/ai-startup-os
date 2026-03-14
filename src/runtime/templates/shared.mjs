export function section(title, lines) {
  return `## ${title}\n\n${lines.join("\n")}\n`;
}

export function bulletList(items, fallback = "- none") {
  if (!items || items.length === 0) return fallback;
  return items.map((item) => `- ${item}`).join("\n");
}

export function summarizePreviousResults(results) {
  if (!results || results.length === 0) {
    return ["No previous artifacts available."];
  }

  return results.map(
    (result) =>
      `${result.sequence}. ${result.artifactName} by ${result.agentTitle} using ${result.skillTitle}`,
  );
}

export function withHeader(context) {
  return [
    `# ${context.task.artifactName}`,
    "",
    `Workflow: ${context.workflow.name}`,
    `Workflow Instance: ${context.workflowInstanceId}`,
    `Task: ${context.task.id}`,
    `Agent: ${context.agent.title} (${context.agent.role})`,
    `Skill: ${context.skill.id}`,
    "",
  ];
}
