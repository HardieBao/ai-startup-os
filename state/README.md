# State Store

This directory is the structured control-plane state layer for `ai-startup-os`.

It is separate from the human-oriented demo outputs under `tasks/` and `memory/`.

## Layout

```text
state/
  workflow-instances/<workflow-instance-id>.json
  tasks/<workflow-instance-id>/<task-id>.json
  runs/<workflow-instance-id>/<run-id>.json
  memory-records/<workflow-instance-id>/<memory-record-id>.json
  events/<workflow-instance-id>.jsonl
  schemas/*.schema.json
```

## Rules

- `state/` is the canonical machine-readable execution state.
- `tasks/results/` remains the artifact output layer.
- `tasks/logs/` remains the plain-text log layer.
- `memory/projects/` remains the aggregate demo export layer.
- `events/*.jsonl` is the append-only execution audit log.
- Each state file carries `kind` and `schemaVersion`.
- Schema files are enforced during writes by the CLI state layer.
