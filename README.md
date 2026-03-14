# AI Startup OS

AI Startup OS is a new system that merges:

- Superpowers-style skill workflows
- Paperclip-style agent orchestration

The design goal is straightforward:

- let AI automatically develop products
- let developers extend agents
- let developers extend skills
- let developers extend workflows
- keep the system maintainable over the long term

The current implementation reference is in TypeScript, but this repository structure is intentionally language-agnostic. The same architecture can be implemented in C# / .NET without changing the core design.

## Core Model

Current control flow:

```text
create company
 -> load agents
 -> load skills
 -> load rules
 -> evaluate rule policies
 -> run workflow
 -> materialize tasks
 -> execute runs
 -> write memory/state/events
```

## Repository Structure

```text
ai-startup-os/
  core/
    agent-engine/
    skill-engine/
    workflow-engine/
    task-engine/
    memory-engine/
  agents/
  skills/
  workflows/
  state/
  tasks/
  tools/
  memory/
  config/
  cli/
  src/
  docs/
```

Notes:

- `core/` is the long-term product architecture shape
- `src/` currently contains the TypeScript reference implementation
- `state/` holds machine-readable runtime state for workflow instances, tasks, runs, decision gates, memory records, and events
- `agents/skills/workflows/config/cli/` hold system-facing definitions and examples

## Five Engines

### Agent Engine

Manages AI workers, org roles, run queue ownership, and task-scoped continuity.

### Skill Engine

Loads and activates skill packages, prompts, templates, and fallback behaviors.

### Workflow Engine

Defines multi-step business workflows such as `build-product`, `ship-feature`, and `fix-bug`.

### Task Engine

Owns task queue state, logs, results, and atomic task checkout semantics.

### Memory Engine

Owns long-term company, project, codebase, and knowledge memory.

## Example CLI

```text
ai-startup build-product
ai-startup new "AI private-domain automation system"
```

Expected system output:

- market analysis
- PRD
- architecture
- code
- testing

## Current Status

Implemented in the TypeScript reference layer:

- agent registry and org structure
- skill package discovery/activation/runtime contracts
- repository-backed skill schema parsing with markdown frontmatter
- template-registry-based execution dispatch for skill rendering
- auto-discovered template modules under `src/runtime/templates/` with CLI compatibility wrappers
- workflow registry and workflow runner
- task store with atomic run checkout
- run queue, task session, and decision gate primitives
- in-memory memory store contract
- runnable demo CLI for `new` and `run <workflow>`
- company control plane with repo-backed company and rule loading
- runtime rule checks recorded as structured events before each workflow step
- runtime rule policies can drive step approval gates, retry budgets, and agent handoffs
- minimal RunExecutor with repository-backed artifact generation and memory writes
- structured state persistence for workflow instances, tasks, runs, decision gates, and memory records under `state/`
- schema-enforced state writes for structured records under `state/schemas/`
- append-only event audit logs under `state/events/*.jsonl`
- `inspect-latest <workflow>` resolves the newest workflow instance by persisted instance metadata instead of filename sort order

## Runtime Notes

- Decision gates are now driven by active rules and auto-approved in demo mode.
- Rules currently serve two roles: validation checks and execution policies.
- Execution policies can currently require a gate, assign retry budget metadata, or hand off a step to another allowed agent.
- `inspect` reads persisted state directly from `state/`.
- `inspect-latest` can show an in-progress view if it is run while `run` is still executing, because workflow state is written incrementally.

Not implemented yet:

- model-backed runtime adapter execution
- persistent memory engine
- retrieval and recall policies
- CLI runtime
- database-backed durable storage

See [Project_Architecture_Blueprint.md](D:\Google_download\HardieSkill\ai-startup-os\docs\Project_Architecture_Blueprint.md) and [Migration_Strategy.md](D:\Google_download\HardieSkill\ai-startup-os\docs\Migration_Strategy.md) for the detailed architecture and migration rules.
