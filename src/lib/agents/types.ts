export type AgentStatus = "ready" | "running" | "completed" | "fallback" | "error";

export type AgentCategory = "market" | "portfolio" | "research" | "education" | "support";

export type AgentRiskLevel = "low" | "medium" | "high";

export interface AgentCatalogItem {
  id: string;
  name: string;
  category: AgentCategory;
  title: string;
  description: string;
  responsibility: string;
  trigger: string;
  cadence: string;
  requiresLogin: boolean;
  outputLabel: string;
}

export interface AgentAction {
  label: string;
  href: string;
  variant?: "primary" | "default";
}

export interface AgentResultSection {
  title: string;
  items: string[];
}

export interface AgentRunResult {
  id: string;
  name: string;
  category: AgentCategory;
  status: Exclude<AgentStatus, "ready" | "running">;
  generatedAt: string;
  targetDate?: string;
  riskLevel?: AgentRiskLevel;
  summary: string;
  sections: AgentResultSection[];
  actions: AgentAction[];
  metadata?: Record<string, string | number | boolean>;
  disclosure: string;
}

export interface AgentExecutionContext {
  userId: string;
  force?: boolean;
}

export interface AgentDefinition extends AgentCatalogItem {
  run: (context: AgentExecutionContext) => Promise<AgentRunResult>;
}
