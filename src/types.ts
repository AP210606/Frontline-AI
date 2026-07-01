export interface TriageItem {
  id: string;
  originalMessage: string;
  category: string;
  secondary_category?: string | null;
  intent: string;
  priority: string;
  urgency: string;
  sentiment: string;
  emotion: string;
  language: string;
  summary: string;
  suggested_action: string;
  needs_human: boolean;
  confidence: number;
  risk_score: number;
  decision_explanation: string[];
  human_review_reasons: string[];
  latency?: number; // processing latency in milliseconds
  timestamp: string;
}

export type PriorityLevel = "P0" | "P1" | "P2" | "P3";

export interface TriageMetrics {
  total: number;
  needsHumanCount: number;
  criticalP0Count: number;
  avgConfidence: number;
  avgLatency: number;
  totalSpam: number;
  priorityDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  highestPriority: string;
  mostCommonCategory: string;
}
