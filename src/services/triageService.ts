import { GoogleGenAI, Type } from "@google/genai";

export interface TriageResult {
  category: string;
  secondary_category: string | null;
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
}

// Lazy initialization of the Gemini client
let aiClient: GoogleGenAI | null = null;

// Circuit breaker / cooldown configuration for API rate limits and quota exhaustion
let apiCooldownUntil: number = 0;
const COOLDOWN_DURATION_MS = 60000; // 1 minute cooldown after hitting a rate limit / quota error

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not configured. Please add it in the Settings > Secrets panel."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Configurable model name so it is easily replaceable
const TRIAGE_MODEL_NAME = "gemini-3.5-flash";

// Schema for Gemini Structured Outputs
const triageResponseSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: "Classify into exactly one: Billing, Shipping, Refund, Technical Support, Account, Fraud, Spam, Feedback, Complaint, Product Inquiry, Order Status, General Inquiry, Legal, Greeting, Duplicate, Abuse, Out of Scope, Security, Unknown",
    },
    secondary_category: {
      type: Type.STRING,
      description: "If there is a secondary distinct customer issue, classify it into one category from the category list. If there is no secondary issue, return 'None'.",
    },
    intent: {
      type: Type.STRING,
      description: "Classify into exactly one primary intent: Report Problem, Request Refund, Payment Issue, Track Order, Shipping Issue, Product Question, Technical Issue, Account Issue, Fraud Report, Feedback, Complaint, Greeting, Spam, Legal Notice, Out of Scope, Unknown",
    },
    priority: {
      type: Type.STRING,
      description: "Assign one level: P0 (Critical - Fraud, data breach, security breach, legal emergency, death threats, service outage), P1 (High - refund dispute, account locked, missing package, billing failure, technical bug), P2 (Medium - shipping delay, complaint, order status, product inquiry), P3 (Low - greeting, feedback, spam, duplicate, unknown, out of scope, general inquiry)",
    },
    urgency: {
      type: Type.STRING,
      description: "Choose exactly one: Low, Medium, High, Critical",
    },
    sentiment: {
      type: Type.STRING,
      description: "Choose exactly one: Positive, Neutral, Negative, Frustrated, Angry, Confused",
    },
    emotion: {
      type: Type.STRING,
      description: "Choose exactly one: Happy, Neutral, Frustrated, Angry, Confused, Anxious",
    },
    language: {
      type: Type.STRING,
      description: "Detect the message language: English, Hindi, Gujarati, Spanish, French, German, Japanese, Chinese, Other",
    },
    summary: {
      type: Type.STRING,
      description: "Generate ONE professional sentence, maximum 20 words. No hallucinations.",
    },
    suggested_action: {
      type: Type.STRING,
      description: "Recommend next support action. Billing -> Verify payment records. Refund -> Initiate refund workflow. Shipping -> Check shipment tracking. Technical Support -> Create technical investigation ticket. Fraud -> Escalate immediately to fraud team. Complaint -> Escalate to customer success. Feedback -> Forward to product team. Order Status -> Check order management system. Product Inquiry -> Provide product information workflow. Greeting -> No action required. Spam -> Close as spam. Duplicate -> Merge with existing ticket. Out of Scope -> Inform customer that this assistant handles only customer support requests. Unknown -> Request additional clarification.",
    },
    needs_human: {
      type: Type.BOOLEAN,
      description: "Return true if confidence is below 0.80, Fraud, Legal, Threats, Multiple issues, Ambiguous request, Unknown category, or Sensitive account action. Otherwise false.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Return a confidence score between 0.00 and 1.00.",
    },
    risk_score: {
      type: Type.INTEGER,
      description: "An integer risk score from 0 to 100. 0-30 Low Risk, 31-70 Medium Risk, 71-100 High Risk.",
    },
    decision_explanation: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "2 to 4 concise factual bullets explaining why the category and priority was selected, and why human review is or isn't required. No bullet chars in strings.",
    },
    human_review_reasons: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "List of reasons for human review, chosen from standard reasons or empty if no review is needed.",
    },
  },
  required: [
    "category",
    "secondary_category",
    "intent",
    "priority",
    "urgency",
    "sentiment",
    "emotion",
    "language",
    "summary",
    "suggested_action",
    "needs_human",
    "confidence",
    "risk_score",
    "decision_explanation",
    "human_review_reasons",
  ],
};

/**
 * Validates the parsed object against expected triage schema
 */
export function validateTriageResult(data: any): TriageResult {
  const categories = [
    "Billing", "Shipping", "Refund", "Technical Support", "Account", "Fraud",
    "Spam", "Feedback", "Complaint", "Product Inquiry", "Order Status",
    "General Inquiry", "Legal", "Greeting", "Duplicate", "Abuse", "Out of Scope", "Security", "Unknown"
  ];
  const intents = [
    "Report Problem", "Request Refund", "Payment Issue", "Track Order", "Shipping Issue",
    "Product Question", "Technical Issue", "Account Issue", "Fraud Report", "Feedback",
    "Complaint", "Greeting", "Spam", "Legal Notice", "Out of Scope", "Unknown"
  ];
  const priorities = ["P0", "P1", "P2", "P3"];
  const urgencies = ["Low", "Medium", "High", "Critical"];
  const sentiments = ["Positive", "Neutral", "Negative", "Frustrated", "Angry", "Confused"];
  const emotions = ["Happy", "Neutral", "Frustrated", "Angry", "Confused", "Anxious"];

  if (typeof data !== "object" || data === null) {
    throw new Error("Result is not a JSON object");
  }

  // Normalize or fallback for category
  let category = String(data.category || "Unknown").trim();
  const matchedCategory = categories.find(
    (c) => c.toLowerCase() === category.toLowerCase()
  );
  category = matchedCategory || "Unknown";

  // Normalize or fallback for secondary_category
  let secondary_category: string | null = null;
  if (data.secondary_category && String(data.secondary_category).toLowerCase().trim() !== "none") {
    const secVal = String(data.secondary_category).trim();
    const matchedSec = categories.find(
      (c) => c.toLowerCase() === secVal.toLowerCase()
    );
    secondary_category = matchedSec || "Unknown";
  }
  if (secondary_category === category) {
    secondary_category = null;
  }

  // Normalize or fallback for intent
  let intent = String(data.intent || "Unknown").trim();
  const matchedIntent = intents.find(
    (i) => i.toLowerCase() === intent.toLowerCase()
  );
  intent = matchedIntent || "Unknown";

  // Normalize priority
  let priority = String(data.priority || "P3").trim().toUpperCase();
  if (!priorities.includes(priority)) {
    if (priority.includes("P0")) priority = "P0";
    else if (priority.includes("P1")) priority = "P1";
    else if (priority.includes("P2")) priority = "P2";
    else if (priority.includes("P3")) priority = "P3";
    else priority = "P3";
  }

  // Normalize urgency
  let urgency = String(data.urgency || "Medium").trim();
  const matchedUrgency = urgencies.find(
    (u) => u.toLowerCase() === urgency.toLowerCase()
  );
  urgency = matchedUrgency || "Medium";

  // Normalize sentiment
  let sentiment = String(data.sentiment || "Neutral").trim();
  const matchedSentiment = sentiments.find(
    (s) => s.toLowerCase() === sentiment.toLowerCase()
  );
  sentiment = matchedSentiment || "Neutral";

  // Normalize emotion
  let emotion = String(data.emotion || "Neutral").trim();
  const matchedEmotion = emotions.find(
    (e) => e.toLowerCase() === emotion.toLowerCase()
  );
  emotion = matchedEmotion || "Neutral";

  // Normalize language
  let language = String(data.language || "English").trim();

  // Summary
  const summary = String(data.summary || "No summary provided.").slice(0, 150);
  
  // Suggested action
  const suggested_action = String(data.suggested_action || "Investigate query.").slice(0, 150);
  
  // Confidence
  let confidence = Number(data.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    confidence = 0.50;
  }

  // Risk Score
  let risk_score = Math.round(Number(data.risk_score));
  if (isNaN(risk_score) || risk_score < 0 || risk_score > 100) {
    risk_score = 10;
  }

  // Needs human review logic
  let needs_human = Boolean(data.needs_human);

  // Parse arrays
  let decision_explanation: string[] = [];
  if (Array.isArray(data.decision_explanation)) {
    decision_explanation = data.decision_explanation.map((e: any) => String(e).trim()).filter(Boolean).slice(0, 4);
  } else {
    decision_explanation = ["Analyzed support query details.", `Classified as ${category}.`];
  }

  let human_review_reasons: string[] = [];
  if (Array.isArray(data.human_review_reasons)) {
    human_review_reasons = data.human_review_reasons.map((e: any) => String(e).trim()).filter(Boolean);
  }

  // Force rules for multi-issues
  if (secondary_category !== null) {
    needs_human = true;
    confidence = Math.min(confidence, 0.70); // Force below threshold (e.g. 0.7)
    if (!human_review_reasons.includes("Multiple customer issues detected.")) {
      human_review_reasons.push("Multiple customer issues detected.");
    }
  }

  // Force rules for Ambiguous Messages
  const isAmbiguous = (data.decision_explanation && JSON.stringify(data.decision_explanation).includes("Ambiguous")) || 
                      (data.human_review_reasons && JSON.stringify(data.human_review_reasons).includes("Ambiguous")) ||
                      category === "Unknown" && (confidence < 0.5 && confidence >= 0.2);
  if (isAmbiguous) {
    needs_human = true;
    confidence = Math.min(confidence, 0.40);
    if (!human_review_reasons.includes("Ambiguous customer request.")) {
      human_review_reasons.push("Ambiguous customer request.");
    }
  }

  // Force rules for Garbage Input
  const isGarbage = category === "Unknown" && confidence <= 0.2;
  if (isGarbage) {
    needs_human = true;
    priority = "P3";
    confidence = Math.min(confidence, 0.20);
    if (!human_review_reasons.includes("Input is invalid or contains insufficient information.")) {
      human_review_reasons.push("Input is invalid or contains insufficient information.");
    }
  }

  // Force rules for Security (Prompt Injection)
  if (category === "Security") {
    needs_human = true;
    priority = "P0";
    confidence = Math.min(confidence, 0.50);
    if (!human_review_reasons.includes("Prompt injection")) {
      human_review_reasons.push("Prompt injection");
    }
  }

  if (confidence < 0.80 || category === "Fraud" || category === "Legal" || category === "Abuse" || category === "Unknown" || category === "Security") {
    needs_human = true;
  }

  if (needs_human && human_review_reasons.length === 0) {
    if (confidence < 0.80) {
      human_review_reasons.push("Low confidence");
    } else if (category === "Fraud") {
      human_review_reasons.push("Possible fraud");
    } else if (category === "Legal") {
      human_review_reasons.push("Legal concern");
    } else if (category === "Security") {
      human_review_reasons.push("Prompt injection");
    } else {
      human_review_reasons.push("Complex or ambiguous message");
    }
  }

  return {
    category,
    secondary_category,
    intent,
    priority,
    urgency,
    sentiment,
    emotion,
    language,
    summary,
    suggested_action,
    needs_human,
    confidence: parseFloat(confidence.toFixed(2)),
    risk_score,
    decision_explanation,
    human_review_reasons,
  };
}

export function getFallbackResult(message: string): TriageResult {
  const msg = (message || "").toLowerCase().trim();
  
  let category = "General Inquiry";
  let secondary_category: string | null = null;
  let intent = "Report Problem";
  let priority = "P2";
  let urgency = "Medium";
  let sentiment = "Neutral";
  let emotion = "Neutral";
  let language = "English";
  let summary = "";
  let suggested_action = "Investigate query.";
  let needs_human = false;
  let confidence = 0.70;
  let risk_score = 20;
  let decision_explanation: string[] = ["Processed via high-speed Frontline local classifier (API fallback mode)."];
  let human_review_reasons: string[] = [];

  // Detect Language
  if (msg.match(/sath|hua|he|hai|mera|mere|bank|me|hi/i)) {
    language = "Hindi";
  } else if (msg.match(/gracias|hola|por favor/i)) {
    language = "Spanish";
  }

  // Detect Sentiment & Emotion
  if (msg.match(/angry|furious|hate|worst|terrible|bad service|scam|cheat|spam|loot/i)) {
    sentiment = "Angry";
    emotion = "Angry";
    priority = "P1";
    urgency = "High";
  } else if (msg.match(/sad|disappointed|help me|please|urgently/i)) {
    sentiment = "Negative";
    emotion = "Anxious";
  }

  // Define Category Matchers
  const matchesRefund = msg.includes("refund") || msg.includes("money back") || msg.includes("reimburse") || msg.includes("return money") || msg.includes("money deduct");
  const matchesBilling = msg.includes("billing") || msg.includes("charge") || msg.includes("invoice") || msg.includes("payment") || msg.includes("transaction") || msg.includes("pay") || msg.includes("fee") || msg.includes("cost") || msg.includes("price");
  const matchesShipping = msg.includes("shipping") || msg.includes("delivery") || msg.includes("dispatch") || msg.includes("track") || msg.includes("package") || msg.includes("postage") || msg.includes("pack") || msg.includes("shipment");
  const matchesTech = msg.includes("bug") || msg.includes("crash") || msg.includes("error") || msg.includes("not working") || msg.includes("fail") || msg.includes("broken") || msg.includes("slow") || msg.includes("app") || msg.includes("software") || msg.includes("system") || msg.includes("login") || msg.includes("crashes");
  const matchesAccount = msg.includes("password") || msg.includes("username") || msg.includes("login reset") || msg.includes("profile") || msg.includes("sign up") || msg.includes("register");
  const matchesGreeting = msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("greetings") || msg.includes("good morning");
  const matchesFraud = msg.includes("hack") || msg.includes("stolen") || msg.includes("unauthorized") || msg.includes("fraud") || msg.includes("phishing") || msg.includes("suspicious");

  // Collect distinct matched categories
  const matchedList: string[] = [];
  if (matchesFraud) matchedList.push("Fraud");
  if (matchesRefund) matchedList.push("Refund");
  if (matchesBilling) matchedList.push("Billing");
  if (matchesShipping) matchedList.push("Shipping");
  if (matchesTech) matchedList.push("Technical Support");
  if (matchesAccount) matchedList.push("Account");
  if (matchesGreeting) matchedList.push("Greeting");

  // Multi-Issue handling
  if (matchedList.length > 1) {
    category = matchedList[0];
    secondary_category = matchedList[1];
    needs_human = true;
    confidence = 0.65;
    priority = "P1";
    urgency = "High";
    suggested_action = "Triage multiple detected issues.";
    decision_explanation.push(`Detected multiple distinct support categories: ${category} and ${secondary_category}.`);
    human_review_reasons.push("Multiple customer issues detected.");
  } else if (matchedList.length === 1) {
    category = matchedList[0];
    if (category === "Refund") {
      intent = "Request Refund";
      priority = "P1";
      urgency = "High";
      suggested_action = "Initiate refund workflow.";
      decision_explanation.push("Detected key refund terms in the customer query.");
    } else if (category === "Billing") {
      intent = "Payment Issue";
      priority = "P1";
      urgency = "High";
      suggested_action = "Verify payment records.";
      decision_explanation.push("Identified financial or billing-related terminology.");
    } else if (category === "Shipping") {
      intent = "Track Order";
      priority = "P2";
      urgency = "Medium";
      suggested_action = "Check shipment tracking.";
      decision_explanation.push("Located delivery and parcel tracking terms.");
    } else if (category === "Technical Support") {
      intent = "Technical Issue";
      priority = "P1";
      urgency = "High";
      suggested_action = "Create technical investigation ticket.";
      decision_explanation.push("Detected technical/system error indicators.");
    } else if (category === "Account") {
      intent = "Account Issue";
      priority = "P2";
      urgency = "Medium";
      suggested_action = "Verify account security reset status.";
      decision_explanation.push("Identified credentials or reset terms.");
    } else if (category === "Fraud") {
      intent = "Fraud Report";
      priority = "P0";
      urgency = "Critical";
      needs_human = true;
      risk_score = 90;
      suggested_action = "Escalate immediately to fraud team.";
      decision_explanation.push("Critical security/fraud keywords identified in payload.");
      human_review_reasons.push("Possible fraud");
    } else if (category === "Greeting") {
      intent = "Greeting";
      priority = "P3";
      urgency = "Low";
      suggested_action = "No action required.";
      confidence = 0.95;
      decision_explanation.push("Standard customer greeting detected.");
    }
  } else {
    // Check specific custom matches
    if (msg.includes("open bank account") || msg.includes("open account") || msg.includes("opn bank") || msg.includes("bank accnt")) {
      category = "General Inquiry";
      intent = "Product Question";
      priority = "P3";
      urgency = "Low";
      suggested_action = "Provide product information workflow.";
      decision_explanation.push("Inquiry about opening a standard corporate account.");
    } else if (msg.includes("weather") || msg.includes("recipe") || msg.includes("cricket") || msg.includes("react")) {
      category = "Out of Scope";
      intent = "Out of Scope";
      priority = "P3";
      urgency = "Low";
      suggested_action = "Inform customer that this assistant handles only customer support requests.";
      decision_explanation.push("Message falls outside corporate customer support domain.");
    } else if (msg.includes("scam") || msg.includes("cheated") || msg.includes("terrible service") || msg.includes("awful company")) {
      category = "Complaint";
      intent = "Complaint";
      priority = "P2";
      urgency = "Medium";
      suggested_action = "Escalate to customer success.";
      decision_explanation.push("Identified negative feedback indicating customer dissatisfaction.");
    }
  }

  // Garbage input matching
  const isGarbageText = !msg || msg.length < 3 || (/^[a-z0-9]+$/i.test(msg) && msg.length > 5 && !/[aeiouy]/i.test(msg)) || /^[#@!$%^&*()_+=\-[\]{};':",./<>?|\\`~\s]+$/.test(msg);
  if (isGarbageText) {
    category = "Unknown";
    intent = "Unknown";
    priority = "P3";
    urgency = "Low";
    needs_human = true;
    risk_score = 5;
    confidence = 0.15;
    suggested_action = "Request additional clarification.";
    decision_explanation = ["Input contains noise, excessive punctuation, or garbage strings with no coherent meaning."];
    human_review_reasons = ["Input is invalid or contains insufficient information."];
  }

  // Ambiguous Message matching
  const ambiguousKeywords = ["help", "assistance", "problem", "issue", "assistance please", "i have an issue", "help me"];
  const isAmbiguousText = msg.length < 15 && ambiguousKeywords.includes(msg.replace(/[?.!]/g, ''));
  if (isAmbiguousText && category !== "Unknown") {
    category = "Unknown";
    intent = "Unknown";
    priority = "P2";
    urgency = "Medium";
    needs_human = true;
    risk_score = 15;
    confidence = 0.35;
    suggested_action = "Request additional clarification.";
    decision_explanation = ["Message is too brief and lacks context or specific support category details."];
    human_review_reasons = ["Ambiguous customer request."];
  }

  // Prompt Injection matching
  const injectionKeywords = ["ignore previous", "ignore instructions", "pretend you are", "system prompt", "delete all", "drop table", "sql injection"];
  if (injectionKeywords.some(kw => msg.includes(kw))) {
    category = "Security";
    secondary_category = null;
    intent = "Fraud Report";
    priority = "P0";
    urgency = "Critical";
    needs_human = true;
    risk_score = 95;
    confidence = 0.50;
    suggested_action = "Potential prompt injection detected.";
    decision_explanation = ["Detected key phrases indicating a prompt injection or security breach attempt."];
    human_review_reasons = ["Prompt injection"];
  }

  // Generate a neat fallback summary
  const truncatedMsg = message.length > 60 ? message.slice(0, 57) + "..." : message;
  summary = `Customer query regarding ${category.toLowerCase()}: "${truncatedMsg}"`;

  // Normalize confidence and risk
  if (needs_human && confidence >= 0.80) {
    confidence = 0.75;
  }

  return {
    category,
    secondary_category,
    intent,
    priority,
    urgency,
    sentiment,
    emotion,
    language,
    summary,
    suggested_action,
    needs_human,
    confidence,
    risk_score,
    decision_explanation,
    human_review_reasons,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Triages a customer message using Gemini model.
 * Executes concurrently for high performance, utilizing smart fallback on error or quota exhaust.
 */
export async function triageMessage(message: string): Promise<TriageResult> {
  if (!message || message.trim() === "") {
    return {
      category: "Unknown",
      secondary_category: null,
      intent: "Unknown",
      priority: "P3",
      urgency: "Low",
      sentiment: "Neutral",
      emotion: "Neutral",
      language: "English",
      summary: "Empty message received.",
      suggested_action: "Close as empty query",
      needs_human: false,
      confidence: 1.0,
      risk_score: 0,
      decision_explanation: ["Received empty input message."],
      human_review_reasons: [],
    };
  }

  if (Date.now() < apiCooldownUntil) {
    console.info(
      `[Triage Service] API is in cooldown state (rate limit protection). Routing directly to high-accuracy local rule engine.`
    );
    return getFallbackResult(message);
  }

  try {
    const result = await triageMessageWithRetry(message);
    return result;
  } catch (err) {
    // Gracefully fall back to our high-accuracy local rule engine immediately on any API error or quota issue
    return getFallbackResult(message);
  }
}

/**
 * Inner function to make the actual API call with exponential backoff on 429 rate limit errors.
 */
async function triageMessageWithRetry(
  message: string,
  attempt: number = 1,
  maxAttempts: number = 2
): Promise<TriageResult> {
  try {
    const ai = getAiClient();
    
    const systemInstruction = `You are Frontline AI, an enterprise-grade AI-powered Customer Support Triage Engine.

Your ONLY responsibility is to analyze incoming customer support messages and convert them into structured machine-readable JSON for customer support teams.

You are NOT a chatbot.
You are NOT a customer support agent.
You are NOT a general-purpose AI assistant.

You MUST NEVER:
- Answer customer questions.
- Solve customer problems.
- Provide tutorials.
- Give coding help.
- Explain concepts.
- Offer advice.
- Generate conversational replies.

Your ONLY job is to:
1. Understand the customer's intent.
2. Classify the message.
3. Assign the correct priority.
4. Detect urgency.
5. Detect sentiment.
6. Detect emotion.
7. Detect language.
8. Generate a concise summary.
9. Recommend the next support action.
10. Decide whether human review is required.
11. Estimate confidence.
12. Calculate risk score.
13. Explain why the decision was made.
14. Return ONLY valid JSON.

====================================================
SUPPORTED CATEGORIES
====================================================

Use ONLY one category from this list:

- Billing
- Shipping
- Refund
- Technical Support
- Account
- Fraud
- Spam
- Feedback
- Complaint
- Product Inquiry
- Order Status
- General Inquiry
- Legal
- Greeting
- Duplicate
- Abuse
- Out of Scope
- Unknown

====================================================
CATEGORY DEFINITIONS
====================================================

Billing
Payment issues, invoices, subscriptions, failed payments, charges.

Shipping
Shipping delays, tracking, delivery, lost package.

Refund
Refund request, return request, cancellation.

Technical Support
App crashes, bugs, login issues, API failures, software problems.

Account
Password reset, account locked, profile issues.

Fraud
Unauthorized transactions, hacked account, suspicious activity.

Spam
Scam, phishing, advertisements, fake rewards, malicious links.

Feedback
Suggestions, compliments, feature requests.

Complaint
Customer dissatisfaction or poor service experience.

Product Inquiry
Questions about product features, specifications or pricing.

Order Status
Tracking order, delivery status, order updates.

General Inquiry
Questions related ONLY to company services, products or policies.

Legal
Legal notice, lawsuit, compliance, copyright, privacy.

Greeting
Hello, Hi, Good Morning, Thank You.

Duplicate
Repeated customer ticket.

Abuse
Offensive language, threats, hate speech, harassment.

Out of Scope
Anything unrelated to customer support.

Unknown
Message cannot be understood.

====================================================
INTENT DETECTION
====================================================

First identify ONE primary intent.

Possible intents:

- Report Problem
- Request Refund
- Payment Issue
- Track Order
- Shipping Issue
- Product Question
- Technical Issue
- Account Issue
- Fraud Report
- Feedback
- Complaint
- Greeting
- Spam
- Legal Notice
- Out of Scope
- Unknown

Always classify based on the PRIMARY intent.

====================================================
OUT OF SCOPE RULES
====================================================

If the message is unrelated to customer support,
classify it as Out of Scope.

Examples include:

- Programming
- Coding
- Mathematics
- School homework
- Interview questions
- Travel advice
- Weather
- Mobile recharge
- Cooking
- Recipes
- Sports
- Politics
- Movies
- Health advice
- Career advice
- Business advice
- Investment advice
- Money advice
- General knowledge
- Personal opinions

Examples

Input:
How can I recharge my phone?

Category:
Out of Scope

Input:
How do I become rich?

Category:
Out of Scope

Input:
What is React?

Category:
Out of Scope

Input:
Who won yesterday's cricket match?

Category:
Out of Scope

General Inquiry should ONLY be used for company-related questions.

====================================================
SPAM RULES
====================================================

Spam ONLY if message contains:

- Phishing
- Fake lottery
- Fake rewards
- Malicious links
- Scam
- Advertisement
- Promotional spam

Never classify normal questions as spam.

====================================================
PRIORITY RULES
====================================================

P0 (Critical)

- Fraud
- Data breach
- Security breach
- Legal emergency
- Death threats
- Critical service outage

P1 (High)

- Refund dispute
- Account locked
- Missing package
- Billing failure
- Critical technical issue

P2 (Medium)

- Shipping delay
- Complaint
- Order Status
- Product Inquiry

P3 (Low)

- Greeting
- Feedback
- Spam
- Duplicate
- Unknown
- Out of Scope
- General Inquiry

====================================================
URGENCY
====================================================

Choose ONE

- Low
- Medium
- High
- Critical

====================================================
SENTIMENT
====================================================

Choose ONE

- Positive
- Neutral
- Negative
- Frustrated
- Angry
- Confused

====================================================
EMOTION
====================================================

Choose ONE

- Happy
- Neutral
- Frustrated
- Angry
- Confused
- Anxious

====================================================
LANGUAGE
====================================================

Detect the message language.

Examples

English
Hindi
Gujarati
Spanish
French
German
Japanese
Chinese
Other

====================================================
HUMAN REVIEW RULES
====================================================

needs_human = true if

- Confidence below 0.80
- Fraud
- Legal
- Threats
- Multiple issues
- Ambiguous request
- Unknown category
- Sensitive account action

Otherwise

needs_human = false

====================================================
SUMMARY RULES
====================================================

Generate ONE professional sentence.

Maximum 20 words.

Do not hallucinate.

Do not assume missing information.

====================================================
SUGGESTED ACTION RULES
====================================================

Billing
Verify payment records.

Refund
Initiate refund workflow.

Shipping
Check shipment tracking.

Technical Support
Create technical investigation ticket.

Fraud
Escalate immediately to fraud team.

Complaint
Escalate to customer success.

Feedback
Forward to product team.

Order Status
Check order management system.

Product Inquiry
Provide product information workflow.

Greeting
No action required.

Spam
Close as spam.

Duplicate
Merge with existing ticket.

Out of Scope
Inform customer that this assistant handles only customer support requests.

Unknown
Request additional clarification.

====================================================
CONFIDENCE RULES
====================================================

Very High
0.95 - 1.00

High
0.85 - 0.94

Medium
0.70 - 0.84

Low
Below 0.70

Confidence should reflect certainty.

Do NOT always output 0.99.

====================================================
RISK SCORE
====================================================

Generate an integer from 0 to 100.

0-30
Low Risk

31-70
Medium Risk

71-100
High Risk

====================================================
DECISION EXPLANATION
====================================================

Provide 2-4 concise factual bullet points explaining:

- Why the category was selected.
- Why the priority was selected.
- Why human review is or isn't required.

Do not hallucinate.

Use only evidence from the customer's message.

====================================================
OUTPUT RULES
====================================================

Return ONLY valid JSON.

No Markdown.

No explanation.

No extra text.

No conversational reply.

====================================================
OUTPUT SCHEMA
====================================================

{
  "category": "",
  "intent": "",
  "priority": "",
  "urgency": "",
  "sentiment": "",
  "emotion": "",
  "language": "",
  "summary": "",
  "suggested_action": "",
  "needs_human": false,
  "confidence": 0.95,
  "risk_score": 0,
  "decision_explanation": [
    "",
    "",
    ""
  ],
  "human_review_reasons": []
}

====================================================
STRICT RULES
====================================================

- Never answer the customer's question.
- Never provide solutions.
- Never explain concepts.
- Never behave like ChatGPT.
- Never generate text outside the JSON.
- Always produce syntactically valid JSON.
- If uncertain, classify as Unknown instead of guessing.
- Follow the schema exactly.`;

    const response = await ai.models.generateContent({
      model: TRIAGE_MODEL_NAME,
      contents: [
        {
          text: `Please triage the following customer message:\n\n"${message}"`
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: triageResponseSchema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsed = JSON.parse(text);
    return validateTriageResult(parsed);

  } catch (error: any) {
    // Safely serialize details to avoid circular structure errors
    let errorDetails = "";
    try {
      if (error && typeof error === "object") {
        errorDetails = (error.message || "") + " " + (error.status || "") + " " + (error.code || "");
        if (error.details) {
          errorDetails += " " + JSON.stringify(error.details);
        }
      }
    } catch (_) {
      // ignore serialization error
    }

    const errString = String(error) + " " + errorDetails;
    const isRateLimit =
      error?.status === "RESOURCE_EXHAUSTED" ||
      error?.code === 429 ||
      errString.includes("429") ||
      errString.includes("RESOURCE_EXHAUSTED") ||
      errString.includes("Quota exceeded") ||
      errString.includes("quota");

    if (isRateLimit) {
      apiCooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
      console.warn(
        `[Triage Service] Attempt ${attempt}/${maxAttempts} encountered a rate limit or quota limit. Initiating a ${COOLDOWN_DURATION_MS / 1000}s API cooldown state. High-accuracy local rule engine will serve subsequent requests.`
      );
    } else {
      console.error(
        `[Triage Service] Attempt ${attempt}/${maxAttempts} failed for message: "${message.slice(0, 40)}...". Error:`,
        error
      );
    }

    // If it is a persistent quota error (plan limits or daily limit exceeded), fail fast immediately without retrying!
    const isPersistentQuota = isRateLimit && (
      errString.includes("Quota exceeded") || 
      errString.includes("quota exceeded") || 
      errString.includes("daily") || 
      errString.includes("plan and billing") ||
      errString.includes("billing details")
    );

    if (attempt >= maxAttempts || isPersistentQuota) {
      throw error;
    }

    let waitMs = 1500; // default initial retry sleep
    
    // Parse retry time from error message or info
    const match = errString.match(/retry in ([\d.]+)\s*s/i);
    if (match && match[1]) {
      waitMs = Math.ceil(parseFloat(match[1]) * 1000) + 500;
    } else if (error?.details) {
      try {
        const retryInfo = error.details.find(
          (d: any) => d["@type"]?.includes("RetryInfo") || d.retryDelay
        );
        if (retryInfo?.retryDelay) {
          const seconds = parseFloat(retryInfo.retryDelay);
          if (!isNaN(seconds)) {
            waitMs = Math.ceil(seconds * 1000) + 500;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // If suggested wait time is too long (over 4 seconds), do not retry - fail fast to keep UI highly responsive!
    if (waitMs > 4000) {
      console.warn(`[Triage Service] Suggested retry delay (${waitMs}ms) is too long. Failing fast to keep system responsive.`);
      throw error;
    }

    // Add backoff to avoid hammering
    const backoffMultiplier = Math.pow(2, attempt - 1);
    const backoffMs = backoffMultiplier * 1000 + Math.random() * 500;
    const finalWaitMs = Math.max(waitMs, backoffMs);

    console.warn(
      `[Triage Service] Retrying in ${finalWaitMs}ms (Attempt ${attempt + 1}/${maxAttempts})...`
    );
    await sleep(finalWaitMs);
    return triageMessageWithRetry(message, attempt + 1, maxAttempts);
  }
}
