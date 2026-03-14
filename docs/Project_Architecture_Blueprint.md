# Project Architecture Blueprint

Generated for the new `ai-startup-os` core being built alongside, but separate from, the upstream `paperclip` and `superpowers` repositories.

## 1. Architectural Position

This project is not an in-place extension of `paperclip`, and it is not a direct rewrite of `superpowers`.

It is a new composition layer that extracts the reusable ideas from both:

- `paperclip` contributes control-plane patterns: agents, orchestration, tasks, approvals, run lifecycle, session continuity
- `superpowers` contributes execution patterns: skills, trigger discipline, planning, implementation, testing, review

The new architecture treats them as two distinct concerns:

```text
company operating system
 -> workflow coordination
 -> agent assignment
 -> skill execution
 -> runtime adapters
```

## 2. Core Architecture

The system is organized around five engines and one execution support layer.

### agent-engine

Responsibility:

- agent registry
- role model
- reporting lines
- ownership and delegation map
- run queue
- task-scoped session continuity

This is where `CEO`, `Product`, `Architect`, `Engineer`, and `QA` are modeled as organizational actors rather than prompt files.

### skill-engine

Responsibility:

- skill registry
- trigger rules
- skill contracts
- mapping from workflow steps to executable capability units

This captures the strongest reusable idea from `superpowers`: skills are not random prompts, they are explicit operational capabilities with trigger conditions and expected outputs.

### workflow-engine

Responsibility:

- workflow definitions
- stage transitions
- goal-to-task breakdown
- ownership by role
- workflow instances
- atomic task checkout
- decision gates

This captures the strongest reusable idea from `paperclip`: goals and tasks should be orchestrated by a control plane, not left to one long-running prompt.

### execution support

Responsibility:

- build execution plans from workflow + roles + skills
- prepare runtime-facing task packets
- remain adapter-agnostic

This layer is intentionally thin. Runtime execution should stay behind adapters so the core does not become coupled to a specific CLI or agent provider.

### memory-engine

Responsibility:

- store long-term company and project memory
- store codebase and knowledge records
- support future task-scoped recall and retrieval

## 3. Repository Structure

```text
ai-startup-os/
  docs/
    Project_Architecture_Blueprint.md
  state/
    workflow-instances/
    tasks/
    runs/
    memory-records/
    events/
    schemas/
  src/
    core/
      agent-engine/
      skill-engine/
      workflow-engine/
      memory-engine/
      execution/
      types.ts
    agents/
    skills/
    workflows/
    adapters/
    index.ts
```

## 4. Domain Model

### Goal

Top-level desired outcome. A goal selects a workflow.

### Workflow

An ordered definition of how a goal moves from intake to delivery.

### Workflow Instance

A runtime instance of a workflow attached to one goal. This is separate from the reusable workflow definition.

### Workflow Step

A unit of orchestration with:

- owner role
- stage
- required skills
- produced artifacts

### Agent

An organizational actor with:

- role
- mission
- reporting line
- capabilities
- default skills

### Skill

A reusable execution capability with:

- category
- purpose
- trigger sources
- input contract
- output contract

### Task

A realized execution unit derived from a workflow step. Tasks are where orchestration becomes actionable work.

### Run

A single execution attempt by one agent against one task. This is the scheduling and logging atom.

### Task Session

Task-scoped continuity state for an agent working across multiple runs on the same task.

### Decision Gate

A governance checkpoint that blocks sensitive actions until approved by a role or human board.

### Memory Record

A stored long-term fact, summary, or learned artifact attached to company, project, codebase, knowledge, or task scope.

## 5. Persistent State Layout

The first durable state layer should be file-backed and machine-readable before any database is introduced.

Recommended runtime layout:

```text
state/
  workflow-instances/<workflow-instance-id>.json
  tasks/<workflow-instance-id>/<task-id>.json
  runs/<workflow-instance-id>/<run-id>.json
  memory-records/<workflow-instance-id>/<memory-record-id>.json
  events/<workflow-instance-id>.jsonl
  schemas/*.schema.json
```

Rules:

- workflow instance state is the top-level control-plane snapshot
- task state is the unit of orchestration progress
- run state is the unit of execution attempt and lifecycle logging
- memory record state is the unit of durable recall
- event log is the append-only audit trail for state transitions
- artifact files stay in `tasks/results/`; state files only point at them
- human-readable aggregate exports may still exist outside `state/`, but `state/` is the canonical structured layer

## 6. Upstream Capability Mapping

### From Paperclip

Reusable:

- agent registry and org structure
- workflow and task coordination
- run and session lifecycle
- approval and control-plane mindset
- adapter boundary between core and runtimes

Do not copy directly:

- full server, database, and UI surface
- every existing entity and schema
- provider-specific runtime details embedded in current services

### From Superpowers

Reusable:

- skills as modular execution units
- trigger-first workflow discipline
- explicit plan/code/test/review phases
- agent-assisted implementation workflow ideas

Do not copy directly:

- platform-specific hook wiring
- repository-specific docs and command wrappers
- hardcoded assumptions tied to one coding harness

## 7. Recommended Evolution Path

Phase 1:

- stabilize core contracts
- finalize role model
- finalize skill model
- finalize workflow model

Phase 2:

- add adapter contracts
- add runtime execution packets
- add memory and task persistence model
- add state storage implementations for runs, tasks, and workflow instances

Phase 3:

- add governance layer
- add approval engine
- add long-term memory subsystem
- add observability and run history

Phase 4:

- add UI or API surfaces after core contracts stop moving

## 8. Architectural Boundaries

Dependency direction should remain:

```text
agents/workflows/skills
 -> core engines
 -> execution support
 -> adapters
```

Not allowed:

- skills importing orchestration internals directly
- adapters defining core domain behavior
- workflows embedding runtime/provider-specific logic

## 9. Blueprint For New Development

When adding a new capability:

1. Decide whether it is a role concern, skill concern, workflow concern, or adapter concern.
2. Extend the relevant contract in `src/core/types.ts`.
3. Register it through the appropriate catalog.
4. Keep runtime-specific details in `src/adapters/`.
5. If a feature spans orchestration and execution, split the concern before implementation.

## 10. Immediate Next Build Targets

The next logical pieces to implement are:

- approval/governance model
- runtime adapter interface
- workflow runner
- run executor with session hydration
- session and decision-gate persistence alongside task/run state
- richer event taxonomy and replay helpers

## 11. Decision Record Summary

- New project instead of direct extension: avoids inheriting mismatched constraints from either upstream
- Five-engine core: creates cleaner seams between company orchestration, execution method, task state, and long-term memory
- Catalog-first architecture: lets the system evolve by registering agents, skills, and workflows without rewriting the core
- Adapter isolation: preserves future compatibility with Codex, Claude Code, Cursor, OpenCode, HTTP, or custom runtimes
