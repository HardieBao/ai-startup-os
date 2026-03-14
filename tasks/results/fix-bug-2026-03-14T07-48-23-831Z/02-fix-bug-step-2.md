# architecture-blueprint

Workflow: Fix Bug
Workflow Instance: fix-bug-2026-03-14T07-48-23-831Z
Task: fix-bug-task-2
Agent: Architect Agent (architect)
Skill: system-architecture

## Architecture Summary

Use a modular service-oriented core centered on workflow orchestration, task execution, and long-term memory.
Separate company control-plane concerns from execution adapters so the product can support multiple agent runtimes later.

## Inputs Considered

- 1. root-cause-summary by QA Agent using Bug Analysis

## Major Components

- Workflow service: defines and advances customer automation flows
- Task service: tracks assigned work, status, and execution outputs
- Integration service: handles CRM, messaging, and analytics connectors
- Memory service: stores project, company, and execution knowledge
- UI/API layer: exposes operator controls and reporting views

## Data Boundaries

- Company data should remain isolated by tenant boundary
- Workflow state should be separate from execution logs
- Execution artifacts should be stored independently from prompt/skill definitions

## Engineering Priorities

- Start with deterministic workflow state transitions
- Keep adapters thin and replaceable
- Make task and memory models stable before scaling integrations
