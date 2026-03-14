# Migration Strategy

## Position

This project should evolve by reference-driven extraction, not direct inheritance.

That means:

- do not build inside `paperclip/`
- do not build inside `superpowers/`
- do not copy large upstream modules wholesale
- do not attempt feature parity before the new core contracts stabilize

## What To Absorb From Paperclip

Absorb conceptually:

- control-plane thinking
- org chart and delegation model
- workflow, task, goal, approval, and run lifecycle
- task-scoped session continuity
- adapter boundary between orchestration and runtime

Do not absorb literally:

- current server layer
- current database schema breadth
- current UI surface
- provider-specific runtime implementations mixed into services

## What To Absorb From Superpowers

Absorb conceptually:

- skill bundle model
- meta-skill bootstrap pattern
- skill activation policy
- plan/code/test/review workflow assets
- reviewer and implementer template pattern

Do not absorb literally:

- platform hook wrappers
- command compatibility shims
- install path assumptions
- platform-specific tool names embedded in prompts

## Recommended Build Order

### Phase 1: Core contracts

- define agent contracts
- define skill package contracts
- define workflow contracts
- define execution plan contracts

### Phase 2: Engine behavior

- add skill discovery
- add skill activation
- add workflow runner
- add task state transitions
- add run queue and task session handling

### Phase 3: Persistent system features

- add memory contract
- add approval contract
- add event log
- add run history

### Phase 4: Runtime integration

- add adapter interface
- add local process adapter
- add HTTP adapter
- add provider-specific adapters only after generic adapters work

## Guardrails

- If a module contains upstream platform assumptions, keep it out of `core/`
- If a concern is runtime-specific, keep it in `adapters/`
- If a concern is organizational, keep it in `agent-engine/` or `workflow-engine/`
- If a concern is method/execution-specific, keep it in `skill-engine/`

## Near-Term Next Step

The most useful next implementation step is to add:

1. `RuntimeAdapter` contract
2. `MemoryStore` contract
3. `RunExecutor`
4. persistent stores for tasks, runs, sessions, and decision gates

That will turn the current architecture skeleton into a usable control core.
