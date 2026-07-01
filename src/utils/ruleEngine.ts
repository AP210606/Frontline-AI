import { TriageItem } from "../types";
import { extractEntities } from "./entityExtractor";

export interface TriggeredRule {
  id: string;
  name: string;
  description: string;
  severity: "info" | "warning" | "danger" | "success";
}

export function evaluateRules(item: TriageItem): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const msgLower = item.originalMessage.toLowerCase();
  const entities = extractEntities(item.originalMessage);

  // 1. Out of Scope Rule
  if (item.category === "Out of Scope" || item.intent === "Out of Scope") {
    rules.push({
      id: "rule_out_of_scope",
      name: "Out of Scope Rejection Policy",
      description: "Non-customer support query detected. Automated message rejection workflow triggered.",
      severity: "danger",
    });
  }

  // 2. Fraud / Security Protocol
  if (
    item.category === "Fraud" ||
    item.intent === "Fraud Report" ||
    msgLower.includes("fraud") ||
    msgLower.includes("hacked") ||
    msgLower.includes("unauthorized") ||
    msgLower.includes("compromised")
  ) {
    rules.push({
      id: "rule_security_fraud",
      name: "Fraud Risk Escalation Rule",
      description: "Potential fraud or user credential compromise detected. Immediate account lockdown & review required.",
      severity: "danger",
    });
  }

  // 3. Legal Risk Advisor
  if (
    item.category === "Legal" ||
    item.intent === "Legal Notice" ||
    msgLower.includes("lawyer") ||
    msgLower.includes("attorney") ||
    msgLower.includes("lawsuit") ||
    msgLower.includes("sue") ||
    msgLower.includes("court")
  ) {
    rules.push({
      id: "rule_legal_advisory",
      name: "Legal Advisory Risk Protocol",
      description: "Mentions of legal entities, lawsuits, or formal compliance complaints. Router assigned to corporate legal desk.",
      severity: "danger",
    });
  }

  // 4. Refund Policy Threshold
  if (
    item.category === "Refund" ||
    item.intent === "Request Refund" ||
    msgLower.includes("refund") ||
    msgLower.includes("money back")
  ) {
    const hasCurrency = entities.some((e) => e.type === "Currency");
    rules.push({
      id: "rule_refund_policy",
      name: "Refund Policy Threshold Rule",
      description: `Refund requested. ${hasCurrency ? "Monetary values verified." : "Awaiting financial details."} Standard refund workflow initiated.`,
      severity: "warning",
    });
  }

  // 5. Billing Verification
  if (item.category === "Billing" || item.intent === "Payment Issue") {
    rules.push({
      id: "rule_billing_verification",
      name: "Billing Reconciliation Policy",
      description: "Invoice or subscription billing dispute. Verifying bank ledger records.",
      severity: "info",
    });
  }

  // 6. High SLA Escalation Rule
  if (item.priority === "P0" || item.priority === "P1" || item.urgency === "Critical" || item.urgency === "High") {
    rules.push({
      id: "rule_high_sla",
      name: "Critical SLA Escalation Rule",
      description: `SLA Priority is set to ${item.priority} (${item.urgency} urgency). Response target is under 15 minutes.`,
      severity: "danger",
    });
  }

  // 7. Human Review Required Gate
  if (item.needs_human) {
    rules.push({
      id: "rule_human_gate",
      name: "Human Gatekeeper Verification",
      description: "Human review mandated due to high risk score, low confidence, or sensitive classification.",
      severity: "warning",
    });
  }

  // 8. Translation & Localization
  if (item.language && item.language !== "English" && item.language !== "Unknown") {
    rules.push({
      id: "rule_localization",
      name: "Multi-Language Localization",
      description: `Message written in ${item.language}. Localized response translation services required.`,
      severity: "info",
    });
  }

  // 9. Spam Filtering Policy
  if (item.category === "Spam" || item.intent === "Spam") {
    rules.push({
      id: "rule_spam_filter",
      name: "Automated Spam Filter Policy",
      description: "Ad links, phishing patterns, or promotional noise detected. Immediate low-priority silent archive.",
      severity: "info",
    });
  }

  // 10. Low Confidence Safeguard
  if (item.confidence < 0.80) {
    rules.push({
      id: "rule_low_confidence",
      name: "Low Confidence Safe-Fail Guard",
      description: `AI categorization confidence falls below 80% threshold (${Math.round(item.confidence * 100)}%). Restricting automated actions.`,
      severity: "warning",
    });
  }

  return rules;
}
