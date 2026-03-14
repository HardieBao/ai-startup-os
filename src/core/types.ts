export type AgentRole =
  | "ceo"
  | "product"
  | "product-manager"
  | "architect"
  | "engineer"
  | "qa"
  | "growth"
  | "custom";

export type SkillCategory =
  | "strategy"
  | "planning"
  | "design"
  | "implementation"
  | "verification"
  | "coordination";

export type WorkflowStage =
  | "intake"
  | "planning"
  | "design"
  | "execution"
  | "verification"
  | "delivery";

export type TriggerSource =
  | "goal_created"
  | "task_assigned"
  | "heartbeat"
  | "manual"
  | "workflow_step";

export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type TaskStatus =
  | "pending"
  | "ready"
  | "in_progress"
  | "blocked"
  | "done";

export type WorkflowInstanceStatus =
  | "pending"
  | "active"
  | "blocked"
  | "completed"
  | "cancelled";

export type DecisionGateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface Goal {
  id: string;
  name: string;
  summary: string;
  workflowId: string;
  companyId?: string;
  constraints?: string[];
}

export interface AgentDefinition {
  id: string;
  role: AgentRole;
  name: string;
  title: string;
  mission: string;
  reportsTo?: string;
  capabilities: string[];
  defaultSkillIds: string[];
}

export interface WorkflowStep {
  id: string;
  name?: string;
  stage?: WorkflowStage;
  summary?: string;
  ownerRole?: AgentRole;
  agentId?: string;
  skillIds?: string[];
  skillId?: string;
  produces?: string[];
  output?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  summary?: string;
  goal?: string;
  entryCriteria?: string[];
  steps: WorkflowStep[];
}

export interface Task {
  id: string;
  title: string;
  summary: string;
  workflowId: string;
  workflowInstanceId: string;
  stepId: string;
  status: TaskStatus;
  assignedAgentId?: string;
  requiredSkillIds?: string[];
  dependsOn?: string[];
  checkoutRunId?: string;
  executionRunId?: string;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  goalId: string;
  companyId?: string;
  status: WorkflowInstanceStatus;
  currentStepId?: string;
  createdTaskIds: string[];
}

export interface Run {
  id: string;
  agentId: string;
  taskId: string;
  workflowInstanceId: string;
  status: RunStatus;
  triggerSource: TriggerSource;
  contextSnapshot: Record<string, unknown>;
}

export interface TaskSession {
  id: string;
  agentId: string;
  taskId: string;
  runId: string;
  summary: string;
  memoryKeys: string[];
}

export interface DecisionGate {
  id: string;
  type: "hire_agent" | "approve_strategy" | "approve_architecture" | "approve_release";
  targetType: "agent" | "workflow_instance" | "task" | "run";
  targetId: string;
  requestedByAgentId: string;
  approverRole: AgentRole | "human_board";
  status: DecisionGateStatus;
  payload: Record<string, unknown>;
}

export interface ExecutionPlan {
  goal: Goal;
  workflow: WorkflowDefinition;
  workflowInstance: WorkflowInstance;
  agents: AgentDefinition[];
  skills: Array<{
    id: string;
    name: string;
    description?: string;
    category: SkillCategory;
  }>;
  tasks: Task[];
}
