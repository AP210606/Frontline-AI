import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Activity,
  Search,
  Filter,
  Download,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  Database,
  ArrowUpDown,
  RefreshCw,
  FileJson,
  FileCode,
  HelpCircle,
  FileText,
  Clock,
  ThumbsUp,
  Sliders,
  Play,
  X,
  Info,
  Cpu
} from "lucide-react";
import { TriageItem, TriageMetrics } from "./types";
import MetricCard from "./components/MetricCard";
import TriageForm from "./components/TriageForm";
import BatchProcessor from "./components/BatchProcessor";
import PipelineVisualizer from "./components/PipelineVisualizer";
import EvaluationPanel from "./components/EvaluationPanel";
import ConfidenceGauge from "./components/ConfidenceGauge";
import RiskMeter from "./components/RiskMeter";
import EntityCard from "./components/EntityCard";
import RuleChip from "./components/RuleChip";
import JsonViewer from "./components/JsonViewer";
import Badge from "./components/Badge";
import { extractEntities } from "./utils/entityExtractor";
import { evaluateRules } from "./utils/ruleEngine";

// Redesigned support helper functions for the enterprise customer support Decision Inspector
function getReasoningBullets(item: TriageItem): string[] {
  const bullets: string[] = [];
  
  // Why AI selected the category
  if (item.category === "Refund") {
    bullets.push("Why Selected: Contains explicit refund-related keywords or refund request markers.");
  } else if (item.category === "Billing") {
    bullets.push("Why Selected: Details transaction fees, invoices, or billing concerns.");
  } else if (item.category === "Fraud") {
    bullets.push("Why Selected: Critical indicators of unauthorized transaction or compromise detected.");
  } else if (item.category === "Shipping") {
    bullets.push("Why Selected: References package transit status, tracking numbers, or carrier delays.");
  } else if (item.category === "Technical Support" || item.category === "Technical") {
    bullets.push("Why Selected: Customer indicates login issues, software bug, or app crashes.");
  } else if (item.category === "Complaint") {
    bullets.push("Why Selected: Expresses general service dissatisfaction or poor experience.");
  } else if (item.category === "Spam") {
    bullets.push("Why Selected: Match with standard unsolicited spam template or phishing pattern.");
  } else if (item.category === "Greeting") {
    bullets.push("Why Selected: Identifies a simple polite customer greeting.");
  } else if (item.category === "Security") {
    bullets.push("Why Selected: Potential prompt injection or system safety boundary violation detected.");
  } else {
    bullets.push(`Why Selected: Classified into category "${item.category}" based on matching indicators.`);
  }

  // Secondary category if available
  if (item.secondary_category) {
    bullets.push(`Secondary Category: Secondary issue classified into "${item.secondary_category}" to ensure full coverage.`);
  }

  // Confidence explanation
  if (item.confidence >= 0.85) {
    bullets.push(`Confidence Explanation: Very high confidence (${Math.round(item.confidence * 100)}%) indicating unambiguous text and clear single-intent match.`);
  } else if (item.confidence >= 0.60) {
    bullets.push(`Confidence Explanation: Moderate confidence (${Math.round(item.confidence * 100)}%) due to potential multi-intent message, broken language or mixed indicators.`);
  } else {
    bullets.push(`Confidence Explanation: Low confidence (${Math.round(item.confidence * 100)}%) due to ambiguous phrasing, garbage inputs, or high uncertainty.`);
  }

  // Escalation reason
  if (item.needs_human) {
    const reasonsStr = (item.human_review_reasons && item.human_review_reasons.length > 0)
      ? item.human_review_reasons.join(", ")
      : "Low confidence classification or critical category";
    bullets.push(`Escalation Reason: Mandating manual analyst verification due to: ${reasonsStr}.`);
  } else {
    bullets.push("Escalation Reason: Auto-approved for automated handling without escalation.");
  }

  return bullets.slice(0, 5); // Keep exactly 3 to 5 bullet points
}

function getExtractedFields(text: string): { label: string; value: string }[] {
  const lower = (text || "").toLowerCase();
  const fields: { label: string; value: string }[] = [];
  
  // 1. Order ID
  const orderMatch = text.match(/(?:order|ord)[#\s-]*(\d{4,8})/i) || text.match(/#(\d{4,8})/);
  if (orderMatch) {
    fields.push({ label: "Order ID", value: `#${orderMatch[1]}` });
  }

  // 2. Invoice Number
  const invoiceMatch = text.match(/INV-\d{4,8}/i);
  if (invoiceMatch) {
    fields.push({ label: "Invoice Number", value: invoiceMatch[0].toUpperCase() });
  }

  // 3. Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    fields.push({ label: "Email", value: emailMatch[0] });
  }

  // 4. Tracking Number
  const trackingMatch = text.match(/1Z[A-Z0-9]{16}|TRK-\d{5,10}/i) || text.match(/tracking\s*(?:number|id)?\s*(?:is|:)\s*([a-zA-Z0-9]{8,18})/i);
  if (trackingMatch) {
    fields.push({ label: "Tracking Number", value: trackingMatch[1] || trackingMatch[0] });
  }

  // 5. Phone Number
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    fields.push({ label: "Phone Number", value: phoneMatch[0] });
  }

  // 6. Currency & Amount
  const moneyMatch = text.match(/(?:\$|€|£|¥)\s*\d+(?:\.\d{2})?/);
  if (moneyMatch) {
    const symbol = moneyMatch[0].charAt(0);
    const code = symbol === '$' ? "USD" : symbol === '€' ? "EUR" : symbol === '£' ? "GBP" : "Other";
    fields.push({ label: "Currency", value: `${symbol} (${code})` });
    fields.push({ label: "Amount", value: moneyMatch[0] });
  }

  // 7. Product Name
  let product = "";
  if (lower.includes("iphone")) product = "iPhone 15 Pro Max";
  else if (lower.includes("svg logo") || lower.includes("svg")) product = "SVG Graphic Resource";
  else if (lower.includes("software")) product = "SaaS Software License";
  else if (lower.includes("hardware")) product = "Hardware Component";
  else if (lower.includes("membership") || lower.includes("subscription")) product = "Pro Subscription";
  else if (lower.includes("app")) product = "Mobile Application";
  
  if (product) {
    fields.push({ label: "Product Name", value: product });
  }

  return fields;
}

function getRecommendedAction(category: string) {
  switch (category) {
    case "Refund":
      return {
        title: "Start refund workflow",
        desc: "Verify purchase records and initiate authorized refund sequence.",
        color: "bg-emerald-50 border-emerald-150 text-emerald-800",
        bulletColor: "bg-emerald-500"
      };
    case "Billing":
      return {
        title: "Verify payment details",
        desc: "Review merchant processor transaction logs and verify client card fees.",
        color: "bg-indigo-50 border-indigo-150 text-indigo-800",
        bulletColor: "bg-indigo-500"
      };
    case "Fraud":
      return {
        title: "Escalate to fraud team",
        desc: "CRITICAL: Immediately flag account and escalate to Threat response.",
        color: "bg-rose-50 border-rose-150 text-rose-800",
        bulletColor: "bg-rose-500"
      };
    case "Shipping":
      return {
        title: "Check shipment tracking",
        desc: "Query logistics endpoint for the package's latest geographic status.",
        color: "bg-amber-50 border-amber-150 text-amber-800",
        bulletColor: "bg-amber-500"
      };
    case "Technical Support":
    case "Technical":
      return {
        title: "Assign Technical Support engineer",
        desc: "Assign to engineering queue to debug console crash or exception logs.",
        color: "bg-sky-50 border-sky-150 text-sky-800",
        bulletColor: "bg-sky-500"
      };
    case "Complaint":
      return {
        title: "Forward to Product Team",
        desc: "Log product friction feedback regarding custom configurations and update releases.",
        color: "bg-violet-50 border-violet-150 text-violet-800",
        bulletColor: "bg-violet-500"
      };
    case "Spam":
    case "Greeting":
      return {
        title: "No action required",
        desc: "Self-closing standard system notification. No human representative required.",
        color: "bg-slate-50 border-slate-150 text-slate-800",
        bulletColor: "bg-slate-500"
      };
    default:
      return {
        title: "Request more information",
        desc: "Query customer for missing parameters to categorize issue correctly.",
        color: "bg-slate-50 border-slate-150 text-slate-800",
        bulletColor: "bg-slate-500"
      };
  }
}

export default function App() {
  const [triageItems, setTriageItems] = useState<TriageItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  // Notification State
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Clear notification automatically after 7 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [filterNeedsHuman, setFilterNeedsHuman] = useState<"All" | "Yes" | "No">("All");
  const [sortField, setSortField] = useState<keyof TriageItem>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset to page 1 on search/filter updates
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedPriority, filterNeedsHuman]);

  // Load initial demo records if empty
  useEffect(() => {
    const demoItems: TriageItem[] = [
      {
        id: "demo1",
        originalMessage: "I ordered a replacement screen last Monday but my package says delayed. I need this urgently for a client work tomorrow. Help!",
        category: "Shipping",
        intent: "Shipping Issue",
        priority: "P1",
        urgency: "High",
        sentiment: "Frustrated",
        emotion: "Frustrated",
        language: "English",
        summary: "Shipping delay for replacement screen package required urgently.",
        suggested_action: "Forward to logistics and notify customer",
        needs_human: true,
        confidence: 0.94,
        risk_score: 45,
        decision_explanation: [
          "Identified high-priority shipping issue.",
          "Urgent delivery timeline request detected.",
          "Routed to logistics tier 1 for immediate scan tracking."
        ],
        human_review_reasons: [
          "Urgent customer timeline"
        ],
        latency: 480,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "demo2",
        originalMessage: "URGENT!!! I see a credit card transaction of $349 from your company that I never approved. This is credit card fraud! Freeze my account and call me.",
        category: "Billing",
        intent: "Fraud Report",
        priority: "P0",
        urgency: "Critical",
        sentiment: "Angry",
        emotion: "Angry",
        language: "English",
        summary: "Unapproved credit card charge reported as fraud.",
        suggested_action: "Escalate to security and billing fraud department immediately",
        needs_human: true,
        confidence: 0.98,
        risk_score: 95,
        decision_explanation: [
          "Security threat: credit card fraud explicitly stated.",
          "Extremely high urgency level detected.",
          "Auto-escalated to billing security operations."
        ],
        human_review_reasons: [
          "Possible fraud",
          "High priority escalation"
        ],
        latency: 510,
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
      {
        id: "demo3",
        originalMessage: "Your app is decent, but please let us customize the category tag colors. Thanks for the quick support on our previous ticket.",
        category: "Feedback",
        intent: "Feedback",
        priority: "P3",
        urgency: "Low",
        sentiment: "Positive",
        emotion: "Happy",
        language: "English",
        summary: "Product feedback requesting custom category tag color settings.",
        suggested_action: "Forward to product and close ticket",
        needs_human: false,
        confidence: 0.96,
        risk_score: 5,
        decision_explanation: [
          "Classified as low priority product suggestion.",
          "Friendly customer tone detected.",
          "Registered to feature request database."
        ],
        human_review_reasons: [],
        latency: 390,
        timestamp: new Date(Date.now() - 1800000).toISOString(),
      }
    ];
    setTriageItems(demoItems);
    setSelectedItem(demoItems[1]); // Preselect the urgent billing issue
  }, []);

  // Compute live diagnostics & metrics
  const metrics: TriageMetrics = useMemo(() => {
    if (triageItems.length === 0) {
      return {
        total: 0,
        needsHumanCount: 0,
        criticalP0Count: 0,
        avgConfidence: 0,
        avgLatency: 0,
        totalSpam: 0,
        priorityDistribution: { P0: 0, P1: 0, P2: 0, P3: 0 },
        categoryDistribution: {},
        highestPriority: "N/A",
        mostCommonCategory: "N/A"
      };
    }
    const total = triageItems.length;
    const needsHumanCount = triageItems.filter((i) => i.needs_human).length;
    const criticalP0Count = triageItems.filter((i) => i.priority === "P0").length;
    
    const sumConfidence = triageItems.reduce((acc, i) => acc + i.confidence, 0);
    const avgConfidence = sumConfidence / total;

    const sumLatency = triageItems.reduce((acc, i) => acc + (i.latency || 450), 0);
    const avgLatency = sumLatency / total;

    const totalSpam = triageItems.filter((i) => i.category === "Spam").length;

    const priorityDistribution: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    const categoryDistribution: Record<string, number> = {};

    triageItems.forEach((item) => {
      priorityDistribution[item.priority] = (priorityDistribution[item.priority] || 0) + 1;
      categoryDistribution[item.category] = (categoryDistribution[item.category] || 0) + 1;
    });

    let highestPriority = "P3";
    if (priorityDistribution.P0 > 0) highestPriority = "P0";
    else if (priorityDistribution.P1 > 0) highestPriority = "P1";
    else if (priorityDistribution.P2 > 0) highestPriority = "P2";

    let mostCommonCategory = "Other";
    let maxCatCount = 0;
    Object.entries(categoryDistribution).forEach(([cat, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        mostCommonCategory = cat;
      }
    });

    return {
      total,
      needsHumanCount,
      criticalP0Count,
      avgConfidence,
      avgLatency,
      totalSpam,
      priorityDistribution,
      categoryDistribution,
      highestPriority,
      mostCommonCategory
    };
  }, [triageItems]);

  // Handle live single analyze
  const handleAnalyzeMessage = async (text: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      
      if (!response.ok) {
        let errMsg = `Triage request failed: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server. The server might be compiling or restarting. Please try again.");
      }

      const data = await response.json();
      const newItem: TriageItem = {
        id: Math.random().toString(36).substring(2, 9),
        originalMessage: text,
        ...data,
        timestamp: new Date().toISOString(),
      };
      setTriageItems((prev) => [newItem, ...prev]);
      setSelectedItem(newItem);
      setNotification({ message: "Message successfully triaged by Frontline AI!", type: "success" });
    } catch (err: any) {
      console.error("Single triage error:", err);
      const errText = String(err.message || err);
      const isQuotaError = errText.includes("Quota") || errText.includes("429") || errText.includes("RESOURCE_EXHAUSTED") || errText.includes("rate limit");
      const displayMsg = isQuotaError 
        ? "Gemini API Quota Exceeded (429 Rate Limit). The 20 requests/day free tier quota was hit. Please try again later or add a paid model API key."
        : `Error: ${err.message || "An unexpected error occurred during triage. Please ensure your GEMINI_API_KEY is configured."}`;
      setNotification({
        message: displayMsg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle batch processing response
  const handleBatchProcessed = (newItems: TriageItem[]) => {
    setTriageItems((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) {
      setSelectedItem(newItems[0]); // Select first item from processed batch
    }
  };

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    return triageItems
      .filter((item) => {
        const matchesSearch =
          item.originalMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.suggested_action.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        const matchesPriority = selectedPriority === "All" || item.priority === selectedPriority;
        const matchesHuman =
          filterNeedsHuman === "All" ||
          (filterNeedsHuman === "Yes" && item.needs_human) ||
          (filterNeedsHuman === "No" && !item.needs_human);

        return matchesSearch && matchesCategory && matchesPriority && matchesHuman;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === "string") {
          return sortDirection === "asc"
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }
        if (typeof valA === "number") {
          return sortDirection === "asc"
            ? (valA as number) - (valB as number)
            : (valB as number) - (valA as number);
        }
        if (typeof valA === "boolean") {
          return sortDirection === "asc"
            ? (valA ? 1 : 0) - (valB ? 1 : 0)
            : (valB ? 1 : 0) - (valA ? 1 : 0);
        }
        return 0;
      });
  }, [triageItems, searchQuery, selectedCategory, selectedPriority, filterNeedsHuman, sortField, sortDirection]);

  // Derive paginated list
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  // Get Unique Categories for dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set(triageItems.map((i) => i.category));
    return ["All", ...Array.from(cats)];
  }, [triageItems]);

  // Sorting helper
  const requestSort = (field: keyof TriageItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // default desc
    }
  };

  // Export functions
  const exportToJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredItems, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `frontline_triage_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportToCSV = () => {
    const headers = ["ID", "Timestamp", "Category", "Priority", "Summary", "Suggested Action", "Needs Human", "Confidence", "Original Message"];
    const rows = filteredItems.map((item) => [
      item.id,
      item.timestamp,
      `"${item.category}"`,
      item.priority,
      `"${item.summary.replace(/"/g, '""')}"`,
      `"${item.suggested_action.replace(/"/g, '""')}"`,
      item.needs_human ? "TRUE" : "FALSE",
      item.confidence,
      `"${item.originalMessage.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `frontline_triage_export_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export beautiful text Summary Report
  const exportSummaryReport = () => {
    let report = `==================================================\n`;
    report += `FRONTLINE AI - SUPPORT TRIAGE SUMMARY REPORT\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `==================================================\n\n`;

    report += `SESSION PERFORMANCE INDICATORS:\n`;
    report += `--------------------------------------------------\n`;
    report += `Total Customer Messages Processed : ${metrics.total}\n`;
    report += `Average Model Confidence Score    : ${Math.round(metrics.avgConfidence * 100)}%\n`;
    report += `Average Processing Latency        : ${(metrics.avgLatency / 1000).toFixed(2)}s\n`;
    report += `Human Reviews / Escapes Required  : ${metrics.needsHumanCount} (${metrics.total > 0 ? Math.round((metrics.needsHumanCount / metrics.total) * 100) : 0}%)\n`;
    report += `Total Critical P0 Alerts Detected : ${metrics.criticalP0Count}\n`;
    report += `Total Spam Messages Suppressed    : ${metrics.totalSpam}\n`;
    report += `Most Common Category Encountered : ${metrics.mostCommonCategory}\n\n`;

    report += `PRIORITY DISTRIBUTION:\n`;
    report += `--------------------------------------------------\n`;
    Object.entries(metrics.priorityDistribution).forEach(([prio, count]) => {
      report += ` - ${prio}: ${count} messages\n`;
    });
    report += `\n`;

    report += `CATEGORY DISTRIBUTION:\n`;
    report += `--------------------------------------------------\n`;
    Object.entries(metrics.categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        report += ` - ${cat}: ${count} messages\n`;
      });
    report += `\n`;

    report += `CRITICAL P0 ACTION LIST:\n`;
    report += `--------------------------------------------------\n`;
    const p0Items = triageItems.filter((i) => i.priority === "P0");
    if (p0Items.length === 0) {
      report += `No critical P0 alerts detected in this session.\n`;
    } else {
      p0Items.forEach((item, index) => {
        report += `${index + 1}. [ID: ${item.id}] [Category: ${item.category}]\n`;
        report += `   Message : "${item.originalMessage}"\n`;
        report += `   Summary : ${item.summary}\n`;
        report += `   Action  : ${item.suggested_action}\n\n`;
      });
    }

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `frontline_triage_summary_report_${Date.now()}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  // Style priority badge
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "P0":
        return "bg-red-50 text-red-700 border-red-200 font-bold";
      case "P1":
        return "bg-orange-50 text-orange-700 border-orange-200 font-bold";
      case "P2":
        return "bg-amber-50 text-amber-700 border-amber-200 font-medium";
      case "P3":
        return "bg-slate-50 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Style urgency badge
  const getUrgencyBadgeClass = (urgency: string) => {
    switch (urgency) {
      case "Critical":
        return "bg-red-50 text-red-700 border-red-200 font-bold text-xs";
      case "High":
        return "bg-orange-50 text-orange-700 border-orange-200 font-bold text-xs";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 font-medium text-xs";
      case "Low":
        return "bg-slate-50 text-slate-700 border-slate-200 text-xs";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 text-xs";
    }
  };

  // Get sentiment emoji
  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case "Positive": return "😊";
      case "Neutral": return "😐";
      case "Negative": return "🙁";
      case "Frustrated": return "😤";
      case "Angry": return "😡";
      case "Confused": return "😕";
      default: return "😐";
    }
  };

  // Get emotion emoji
  const getEmotionEmoji = (emotion: string) => {
    switch (emotion) {
      case "Happy": return "😄";
      case "Neutral": return "😐";
      case "Frustrated": return "😤";
      case "Angry": return "😡";
      case "Confused": return "😕";
      case "Anxious": return "😰";
      default: return "😐";
    }
  };

  // Get risk level details
  const getRiskLevelDetails = (score: number) => {
    if (score <= 30) {
      return { label: "Low Risk", class: "text-emerald-700 bg-emerald-50 border border-emerald-100 font-bold", progressClass: "bg-emerald-500" };
    } else if (score <= 70) {
      return { label: "Medium Risk", class: "text-amber-700 bg-amber-50 border border-amber-100 font-bold", progressClass: "bg-amber-500" };
    } else {
      return { label: "High Risk", class: "text-rose-700 bg-rose-50 border border-rose-100 font-bold", progressClass: "bg-rose-500" };
    }
  };

  // Style confidence indicators
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.85) {
      return {
        label: "High Confidence",
        class: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    } else if (confidence >= 0.60) {
      return {
        label: "Medium Confidence",
        class: "bg-amber-50 text-amber-700 border-amber-200",
      };
    } else {
      return {
        label: "Low Confidence (Auto-Escalated)",
        class: "bg-rose-50 text-rose-700 border-rose-200",
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-md">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Frontline AI
                <span className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                  Support Triage Core
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Structured decision-making pipeline for unorganized raw customer communications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 font-semibold border border-slate-200">
              <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>AI Classifier Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Metric Overview Row */}
        <MetricCard metrics={metrics} triageItems={triageItems} />

        {/* Dashboard Workstation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Workstation Input (Form + Dataset Drag-drop) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm flex gap-1">
              <button
                onClick={() => setActiveTab("single")}
                className={`flex-1 text-center py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "single"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Analyze Single Message
              </button>
              <button
                onClick={() => setActiveTab("batch")}
                className={`flex-1 text-center py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "batch"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Bulk Dataset Processing
              </button>
            </div>

            <div className="flex-1">
              {activeTab === "single" ? (
                <TriageForm onAnalyze={handleAnalyzeMessage} isLoading={isLoading} />
              ) : (
                <BatchProcessor
                  onBatchProcessed={handleBatchProcessed}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              )}
            </div>
          </div>

          {/* RIGHT: Analysis Decision Inspector Panel */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4 flex justify-between items-center bg-slate-50/55">
                <div className="flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-indigo-600" />
                  <h2 className="text-sm font-display font-bold text-slate-800 uppercase tracking-wider">
                    Decision Inspector & Structure Output
                  </h2>
                </div>
                {selectedItem && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold">
                    ID: {selectedItem.id}
                  </span>
                )}
              </div>

              {selectedItem ? (
                <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[850px] scrollbar-thin bg-slate-50/30">
                  
                  {/* Card 1: Core Triage Summary */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                    {/* ORIGINAL RAW INPUT MESSAGE */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Original Raw Input Message
                        </span>
                        {selectedItem.latency && (
                          <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2.5 py-0.5 rounded-md font-bold border border-slate-200">
                            {selectedItem.latency}ms
                          </span>
                        )}
                      </div>
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4.5 italic font-semibold text-slate-700 leading-relaxed text-sm">
                        "{selectedItem.originalMessage}"
                      </div>
                    </div>

                    {/* Assigned Category and Triage Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                          Assigned Category
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700">
                            {selectedItem.category}
                          </span>
                          {selectedItem.secondary_category && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 border border-slate-200 text-slate-600">
                              Secondary: {selectedItem.secondary_category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                          Triage Priority
                        </span>
                        <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-extrabold border ${getPriorityBadgeClass(selectedItem.priority)}`}>
                          {selectedItem.priority} • {selectedItem.priority === "P0" ? "Critical" : selectedItem.priority === "P1" ? "High" : selectedItem.priority === "P2" ? "Medium" : "Low"}
                        </span>
                      </div>
                    </div>

                    {/* Structured Summary */}
                    <div className="space-y-1 pt-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Structured Summary
                      </span>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed">
                        {selectedItem.summary}
                      </p>
                    </div>

                    {/* Recommended Support Action */}
                    <div className="space-y-1 pt-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Recommended Support Action
                      </span>
                      <p className="text-sm font-extrabold text-emerald-600 flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                        {selectedItem.suggested_action}
                      </p>
                    </div>

                    {/* Human Review Status and AI Confidence Score */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Human Review Status
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${selectedItem.needs_human ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          {selectedItem.needs_human ? "⚠️ ESCALATED TO HUMAN" : "AUTOMATED COMPLETE"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                          AI Confidence Score
                        </span>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {(selectedItem.confidence || 0.9).toFixed(2)}
                          </span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${(selectedItem.confidence || 0.9) * 100}%` }}
                            />
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getConfidenceBadge(selectedItem.confidence || 0.9).class}`}>
                            {getConfidenceBadge(selectedItem.confidence || 0.9).label.split(" (")[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: AI Decision Pipeline Visualization */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h3 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-indigo-600" />
                          AI Decision Pipeline Visualization
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Real-time step-by-step processing details for the current support ticket
                        </p>
                      </div>
                      {selectedItem.latency && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">
                          {(selectedItem.latency / 1000).toFixed(2)}s Latency
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      {/* Step 1 */}
                      <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/10 flex flex-col justify-between min-h-[140px] shadow-3xs">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-extrabold text-blue-800">1. Raw Ingestion</span>
                          <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal mt-2">
                          Raw message received & normalized
                        </p>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-mono px-2 py-1 rounded border border-blue-100 mt-3 truncate font-bold block text-center">
                          "{selectedItem.originalMessage}"
                        </span>
                      </div>

                      {/* Step 2 */}
                      <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/10 flex flex-col justify-between min-h-[140px] shadow-3xs">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-extrabold text-purple-800">2. Gemini 3.5 Flash</span>
                          <Cpu className="w-4 h-4 text-purple-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal mt-2">
                          Structured inference & classification
                        </p>
                        <span className="bg-purple-50 text-purple-700 text-[10px] font-mono px-2 py-1 rounded border border-purple-100 mt-3 font-bold block text-center">
                          Confidence: {Math.round((selectedItem.confidence || 0.9) * 100)}%
                        </span>
                      </div>

                      {/* Step 3 */}
                      <div className="border border-amber-100 rounded-xl p-4 bg-amber-50/10 flex flex-col justify-between min-h-[140px] shadow-3xs">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-extrabold text-amber-800">3. Schema Validation</span>
                          <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal mt-2">
                          Rigid type and bounds inspection
                        </p>
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-mono px-2 py-1 rounded border border-amber-100 mt-3 font-bold block text-center truncate" title={selectedItem.category}>
                          Category: {selectedItem.category}
                        </span>
                      </div>

                      {/* Step 4 */}
                      <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/10 flex flex-col justify-between min-h-[140px] shadow-3xs">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-extrabold text-emerald-800">4. Output Delivery</span>
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal mt-2">
                          Explanations & final routing
                        </p>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono px-2 py-1 rounded border border-emerald-100 mt-3 font-bold block text-center">
                          Escalate: {selectedItem.needs_human ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: AI Decision Explanation & Rationale */}
                  <div className="bg-indigo-50/10 border border-indigo-100 rounded-2xl p-6 space-y-3.5 shadow-sm">
                    <h3 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4 text-indigo-600" />
                      AI Decision Explanation & Rationale
                    </h3>
                    <ul className="space-y-2.5 text-xs text-slate-700 list-disc list-inside">
                      {((selectedItem.decision_explanation && selectedItem.decision_explanation.length > 0)
                        ? selectedItem.decision_explanation
                        : getReasoningBullets(selectedItem)
                      ).map((bullet, idx) => (
                        <li key={idx} className="leading-relaxed font-semibold pl-1">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card 4: JSON Output */}
                  <div className="border-t border-slate-150 pt-6">
                    <JsonViewer
                      title="VALID MACHINE-READABLE JSON OUTPUT"
                      data={{
                        category: selectedItem.category,
                        secondary_category: selectedItem.secondary_category || null,
                        priority: selectedItem.priority,
                        summary: selectedItem.summary,
                        suggested_action: selectedItem.suggested_action,
                        needs_human: selectedItem.needs_human,
                        confidence: selectedItem.confidence,
                        decision_explanation: selectedItem.decision_explanation && selectedItem.decision_explanation.length > 0 ? selectedItem.decision_explanation : getReasoningBullets(selectedItem),
                        human_review_reasons: selectedItem.human_review_reasons || []
                      }}
                    />
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 min-h-[400px]">
                  <HelpCircle className="w-10 h-10 text-slate-300 stroke-[1.5] animate-bounce" />
                  <div>
                    <p className="font-semibold text-sm text-slate-700">No Analysis Loaded</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Submit a single customer message on the left or load a support dataset to begin real-time triage.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION: Model Evaluation Tool */}
        <EvaluationPanel />

        {/* SECTION: Analysis History Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/55 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Analysis History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Query records, filter by priority labels, and download machine-readable triage reports
              </p>
            </div>

            {/* Export Toolbar */}
            <div className="flex items-center gap-2 self-stretch md:self-auto">
              <button
                onClick={exportSummaryReport}
                disabled={filteredItems.length === 0}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Summary Report
              </button>
              <button
                onClick={exportToJSON}
                disabled={filteredItems.length === 0}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
              <button
                onClick={exportToCSV}
                disabled={filteredItems.length === 0}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filtering Options Grid */}
          <div className="p-6 border-b border-slate-100 bg-white grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search raw messages, summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Category dropdown filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="All">Category: All</option>
                {uniqueCategories.filter(cat => cat !== "All").map((cat) => (
                  <option key={cat} value={cat}>
                    Category: {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority dropdown filter */}
            <div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="All">Priority: All</option>
                <option value="P0">Priority: P0 (Critical)</option>
                <option value="P1">Priority: P1 (High)</option>
                <option value="P2">Priority: P2 (Medium)</option>
                <option value="P3">Priority: P3 (Low)</option>
              </select>
            </div>

            {/* Needs human review dropdown filter */}
            <div>
              <select
                value={filterNeedsHuman}
                onChange={(e) => setFilterNeedsHuman(e.target.value as any)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="All">Human Review: All</option>
                <option value="Yes">Needs Human: Yes</option>
                <option value="No">Needs Human: No</option>
              </select>
            </div>
          </div>

          {/* Table view */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-6">Ticket ID</th>
                  <th className="py-3 px-6">
                    <button
                      onClick={() => requestSort("timestamp")}
                      className="flex items-center gap-1 hover:text-slate-700 cursor-pointer"
                    >
                      Timestamp
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">
                    <button
                      onClick={() => requestSort("priority")}
                      className="flex items-center gap-1 hover:text-slate-700 cursor-pointer"
                    >
                      Priority
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-6">
                    <button
                      onClick={() => requestSort("confidence")}
                      className="flex items-center gap-1 hover:text-slate-700 cursor-pointer"
                    >
                      Confidence
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-6">Needs Human</th>
                  <th className="py-3 px-6">Processing Time</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                <AnimatePresence initial={false}>
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map((item) => {
                      // Resolve Ticket Status
                      const statusLabel = item.needs_human 
                        ? "Human Review Required" 
                        : item.confidence >= 0.85 
                          ? "Fully Triaged" 
                          : "Review Pending";

                      const statusClass = item.needs_human
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : item.confidence >= 0.85
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200";

                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`hover:bg-slate-50/70 transition-all cursor-pointer ${
                            selectedItem?.id === item.id ? "bg-indigo-50/30 font-medium" : ""
                          }`}
                          onClick={() => setSelectedItem(item)}
                        >
                          <td className="py-3.5 px-6 font-mono font-bold text-indigo-600">
                            #{item.id.length > 8 ? item.id.substring(0, 8) : item.id}
                          </td>
                          <td className="py-3.5 px-6 text-slate-400 font-mono text-[11px]">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50/80 text-indigo-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPriorityBadgeClass(item.priority)}`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className={item.confidence >= 0.85 ? "text-indigo-600 font-bold" : "text-amber-600"}>
                                {Math.round(item.confidence * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.needs_human
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {item.needs_human ? "YES" : "NO"}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-mono text-slate-500">
                            {((item.latency || 450) / 1000).toFixed(2)}s
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`inline-flex items-center px-2 py-0.5 border rounded-full text-[10px] font-semibold ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-900 font-semibold gap-0.5 cursor-pointer"
                            >
                              Inspect
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No triaged messages found matching the criteria.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="bg-slate-50/55 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <div className="text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-700">{Math.min(filteredItems.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{" "}
                <span className="font-bold text-slate-700">{Math.min(filteredItems.length, currentPage * itemsPerPage)}</span> of{" "}
                <span className="font-bold text-slate-700">{filteredItems.length}</span> entries
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                        currentPage === pNum
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-center text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-300">Frontline AI © 2026</p>
          <p className="max-w-md mx-auto opacity-75">
            Engineered for low-latency, deterministic multi-channel triage using the Gemini 3.5 structured output API. Designed for modern support workflows.
          </p>
        </div>
      </footer>

      {/* Floating Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl shadow-xl border flex items-start gap-3 pointer-events-auto ${
                notification.type === "success"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-100/40"
                  : notification.type === "error"
                    ? "bg-rose-50 border-rose-100 text-rose-800 shadow-rose-100/40"
                    : "bg-indigo-50 border-indigo-100 text-indigo-800 shadow-indigo-100/40"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : notification.type === "error" ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold tracking-tight">
                  {notification.type === "success" ? "Success" : notification.type === "error" ? "Notification" : "Info"}
                </p>
                <p className="text-xs mt-0.5 text-slate-600 font-medium">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
