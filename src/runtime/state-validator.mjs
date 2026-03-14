import fs from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./repo-paths.mjs";

const schemasDir = path.join(repoRoot, "state", "schemas");

const schemaFiles = {
  "workflow-instance": "workflow-instance.schema.json",
  task: "task.schema.json",
  run: "run.schema.json",
  "memory-record": "memory-record.schema.json",
  "decision-gate": "decision-gate.schema.json",
  event: "event.schema.json",
};

let schemaCachePromise;

function formatPath(pathSegments) {
  if (!pathSegments.length) {
    return "value";
  }

  return pathSegments
    .map((segment, index) => {
      if (typeof segment === "number") {
        return `[${segment}]`;
      }
      return index === 0 ? segment : `.${segment}`;
    })
    .join("");
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateTypeOnly(value, typeName) {
  switch (typeName) {
    case "object":
      return isPlainObject(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return true;
  }
}

function validateAgainstSchema(value, schema, pathSegments = []) {
  const errors = [];
  const location = formatPath(pathSegments);

  if (Array.isArray(schema.type)) {
    const matches = schema.type.some((typeName) => validateTypeOnly(value, typeName));
    if (!matches) {
      errors.push(`${location} must be one of types: ${schema.type.join(", ")}`);
      return errors;
    }
  } else if (schema.type && !validateTypeOnly(value, schema.type)) {
    errors.push(`${location} must be of type ${schema.type}`);
    return errors;
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${location} must equal ${JSON.stringify(schema.const)}`);
    return errors;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${location} must be one of: ${schema.enum.join(", ")}`);
    return errors;
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push(`${location} must have length >= ${schema.minLength}`);
    }
  }

  if (typeof value === "number" || typeof value === "bigint") {
    if (typeof schema.minimum === "number" && Number(value) < schema.minimum) {
      errors.push(`${location} must be >= ${schema.minimum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateAgainstSchema(item, schema.items, [...pathSegments, index]));
      });
    }
    return errors;
  }

  if (!isPlainObject(value)) {
    return errors;
  }

  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  for (const key of required) {
    if (!(key in value)) {
      errors.push(`${location}.${key} is required`);
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        errors.push(`${location}.${key} is not allowed`);
      }
    }
  }

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (!(key in value)) continue;
    errors.push(...validateAgainstSchema(value[key], propertySchema, [...pathSegments, key]));
  }

  return errors;
}

async function loadSchemas() {
  const records = await Promise.all(
    Object.entries(schemaFiles).map(async ([kind, fileName]) => {
      const schemaPath = path.join(schemasDir, fileName);
      const content = await fs.readFile(schemaPath, "utf8");
      return [kind, JSON.parse(content)];
    }),
  );

  return Object.fromEntries(records);
}

async function getSchemas() {
  if (!schemaCachePromise) {
    schemaCachePromise = loadSchemas();
  }

  return schemaCachePromise;
}

export async function validateStateRecord(record) {
  const schemas = await getSchemas();
  const kind = record?.kind;
  const schema = schemas[kind];

  if (!schema) {
    throw new Error(`No schema registered for record kind: ${String(kind)}`);
  }

  const errors = validateAgainstSchema(record, schema);
  if (errors.length > 0) {
    throw new Error(`Schema validation failed for ${kind}: ${errors.join("; ")}`);
  }
}
