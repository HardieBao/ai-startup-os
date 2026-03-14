# unit-test-coverage

Workflow: Ship Feature
Workflow Instance: ship-feature-2026-03-14T07-52-03-407Z
Task: ship-feature-task-4
Agent: QA Agent (qa)
Skill: unit-test

## Unit Test Focus

Cover the narrowest logic slice changed by the implementation task.

## Inputs Considered

- 1. prioritized-roadmap by Product Agent using Feature Prioritization
- 2. api-contract by Architect Agent using API Design
- 3. implementation-draft by Engineer Agent using Code Generation

## Suggested Test Targets

- workflow step transition logic
- task status updates
- artifact persistence behavior
