import path from "node:path";

function trimValue(value) {
  return value.trim().replace(/^"(.*)"$/, "$1");
}

export function parseSimpleYamlMap(text) {
  const result = {};
  let currentListKey = null;
  let currentObjectItem = null;

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const topLevelMatch = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (topLevelMatch && !rawLine.startsWith(" ")) {
      const [, key, value] = topLevelMatch;
      if (value.trim()) {
        result[key] = trimValue(value);
        currentListKey = null;
        currentObjectItem = null;
      } else {
        result[key] = [];
        currentListKey = key;
        currentObjectItem = null;
      }
      continue;
    }

    const objectListStartMatch = rawLine.match(/^\s*-\s*([A-Za-z0-9_-]+):\s*(.+)$/);
    if (objectListStartMatch && currentListKey) {
      const [, key, value] = objectListStartMatch;
      currentObjectItem = {
        [key]: trimValue(value),
      };
      result[currentListKey].push(currentObjectItem);
      continue;
    }

    const listItemMatch = rawLine.match(/^\s*-\s*(.+)$/);
    if (listItemMatch && currentListKey) {
      result[currentListKey].push(trimValue(listItemMatch[1]));
      currentObjectItem = null;
      continue;
    }

    const nestedMatch = rawLine.match(/^\s+([A-Za-z0-9_-]+):\s*(.+)$/);
    if (nestedMatch && currentObjectItem) {
      const [, key, value] = nestedMatch;
      currentObjectItem[key] = trimValue(value);
    }
  }

  return result;
}

export function parseWorkflowYaml(text) {
  const result = {};
  let inSteps = false;
  let currentStep = null;

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;

    const topLevelMatch = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (topLevelMatch && !rawLine.startsWith(" ")) {
      const [, key, value] = topLevelMatch;
      if (key === "steps") {
        inSteps = true;
        result.steps = [];
      } else {
        result[key] = trimValue(value);
      }
      currentStep = null;
      continue;
    }

    if (!inSteps) continue;

    const scalarStepMatch = rawLine.match(/^\s*-\s*([A-Za-z0-9_-]+)\s*$/);
    if (scalarStepMatch) {
      result.steps.push(trimValue(scalarStepMatch[1]));
      currentStep = null;
      continue;
    }

    const objectStartMatch = rawLine.match(/^\s*-\s*([A-Za-z0-9_-]+):\s*(.+)$/);
    if (objectStartMatch) {
      const [, key, value] = objectStartMatch;
      currentStep = {
        [key]: trimValue(value),
      };
      result.steps.push(currentStep);
      continue;
    }

    const nestedMatch = rawLine.match(/^\s+([A-Za-z0-9_-]+):\s*(.+)$/);
    if (nestedMatch && currentStep) {
      const [, key, value] = nestedMatch;
      currentStep[key] = trimValue(value);
    }
  }

  return result;
}

export function parseSkillMarkdown(text, filePath) {
  const lines = text.split(/\r?\n/);
  let frontmatter = {};
  let bodyLines = lines;

  if (lines[0]?.trim() === "---") {
    let endIndex = -1;
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim() === "---") {
        endIndex = i;
        break;
      }
    }

    if (endIndex !== -1) {
      frontmatter = parseSimpleYamlMap(lines.slice(1, endIndex).join("\n"));
      bodyLines = lines.slice(endIndex + 1);
    }
  }

  const titleLine = bodyLines.find((line) => line.startsWith("# "));
  const inputs = [];
  const outputs = [];
  let section = null;

  for (const rawLine of bodyLines) {
    const line = rawLine.trim();
    if (line === "Input:") {
      section = "input";
      continue;
    }
    if (line === "Output:") {
      section = "output";
      continue;
    }
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("- ")) {
      const value = line.slice(2).trim();
      if (section === "input") inputs.push(value);
      if (section === "output") outputs.push(value);
    }
  }

  return {
    id: frontmatter.id ?? path.basename(filePath, ".md"),
    category: frontmatter.category ?? path.basename(path.dirname(filePath)),
    mode: frontmatter.mode ?? "template",
    template: frontmatter.template ?? path.basename(filePath, ".md"),
    title: titleLine ? titleLine.slice(2).trim() : path.basename(filePath, ".md"),
    inputs,
    outputs,
    filePath,
  };
}
