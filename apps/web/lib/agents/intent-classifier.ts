// Source: Llama Cookbook — adapted from intent classification patterns
// NEXUS ON Estimating — Intent Classifier

import type { AgentDomain, AgentContext, IntentClassification } from '@on/db';

/**
 * Intent classification prompt template for Claude API.
 * The classifier analyzes user messages and determines which agent(s) to route to.
 */
const CLASSIFICATION_SYSTEM_PROMPT = `You are the Intent Classifier for NEXUS ON Estimating, an AI-powered construction estimating platform.

Analyze the user's message and determine which AI agent(s) should handle it.

Available agents and their domains:
- TAKEOFF: Plan reading, symbol detection, area measurement, BIM extraction, quantity verification, revision comparison
- PRICING: Material pricing, RSMeans lookups, assembly building, cost escalation, regional adjustments, ML cost validation
- BID: Bid reading, bid leveling, ITB generation, subcontractor matching, scope gap detection, RFQ generation
- ANALYTICS: Profitability prediction, what-if scenarios, proposal generation, trend analysis, cost comparison
- COMPLIANCE: COI monitoring, tax calculation, audit logging, Davis-Bacon wage compliance
- COLLABORATION: Conflict resolution, notifications, permissions, version control, presence tracking

Respond with a JSON object (no markdown) matching this structure:
{
  "primaryAgent": "<domain>",
  "secondaryAgents": ["<domain>", ...],
  "skills": ["<skill-id>", ...],
  "confidence": <0.0-1.0>,
  "requiresChaining": <boolean>,
  "chainOrder": ["<domain>", ...],
  "contextNeeded": ["estimate"|"project"|"plan"|"bid"|"cost_item", ...],
  "userIntent": "<brief summary of what the user wants>"
}

Rules:
1. If the request involves multiple domains, set requiresChaining=true and specify chainOrder.
2. Set confidence based on how clearly the message maps to a domain.
3. For ambiguous messages, prefer the agent matching the current page context.
4. "Estimate this wall" → takeoff (quantities) → pricing (costs) → analytics (profitability check)
5. "Compare bids" → bid (leveling) → analytics (comparison)
6. General questions about an estimate → analytics (it has the broadest analytical scope)`;

/**
 * Classifies user intent and determines which agent(s) to route to.
 * Uses Claude API with structured output for reliable classification.
 */
export async function classifyIntent(
  userMessage: string,
  context: AgentContext,
  pageContext?: string
): Promise<IntentClassification> {
  // Build context-aware prompt
  const contextHints: string[] = [];
  if (context.activeEstimateId) contextHints.push(`User is viewing estimate: ${context.activeEstimateId}`);
  if (context.activeProjectId) contextHints.push(`Active project: ${context.activeProjectId}`);
  if (context.activePlanId) contextHints.push(`Viewing plan: ${context.activePlanId}`);
  if (pageContext) contextHints.push(`Current page: ${pageContext}`);

  const userPrompt = `${contextHints.length > 0 ? `Context:\n${contextHints.join('\n')}\n\n` : ''}User message: "${userMessage}"`;

  try {
    // Call Claude API for classification
    const response = await fetch('/api/ai/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
        userPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Classification failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data as IntentClassification;
  } catch {
    // Fallback: use keyword-based classification
    return keywordClassify(userMessage, context);
  }
}

/**
 * Fast keyword-based fallback classifier when API is unavailable.
 */
function keywordClassify(message: string, _context: AgentContext): IntentClassification {
  const lower = message.toLowerCase();

  const domainKeywords: Record<AgentDomain, string[]> = {
    takeoff: ['takeoff', 'plan', 'drawing', 'measure', 'count', 'symbol', 'detect', 'area', 'volume', 'linear', 'scale', 'bim', 'ifc', 'revit', 'dwg', 'dxf', 'sheet', 'quantity', 'quantities'],
    pricing: ['price', 'cost', 'rate', 'rsmeans', 'material', 'labor', 'equipment', 'assembly', 'assemblies', 'escalation', 'supplier', 'unit cost', 'per unit', 'region'],
    bid: ['bid', 'sub', 'subcontractor', 'itb', 'rfq', 'quote', 'proposal', 'vendor', 'scope', 'level', 'compare bids'],
    analytics: ['profit', 'margin', 'trend', 'forecast', 'what-if', 'scenario', 'compare', 'analysis', 'report', 'dashboard', 'predict'],
    compliance: ['compliance', 'davis-bacon', 'prevailing wage', 'tax', 'insurance', 'coi', 'audit', 'regulation', 'far'],
    collaboration: ['share', 'collaborate', 'version', 'conflict', 'notify', 'permission', 'approval', 'comment'],
  };

  let bestDomain: AgentDomain = 'analytics'; // default fallback
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(domainKeywords) as [AgentDomain, string[]][]) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  // Check for chaining patterns
  const needsChaining =
    (lower.includes('estimate') && lower.includes('wall')) || // takeoff → pricing
    (lower.includes('compare') && lower.includes('bid')); // bid → analytics

  const chainOrder: AgentDomain[] = needsChaining
    ? bestDomain === 'takeoff'
      ? ['takeoff', 'pricing', 'analytics']
      : bestDomain === 'bid'
        ? ['bid', 'analytics']
        : [bestDomain]
    : [bestDomain];

  return {
    primaryAgent: bestDomain,
    secondaryAgents: chainOrder.slice(1),
    skills: [],
    confidence: bestScore > 0 ? Math.min(0.5 + bestScore * 0.15, 0.95) : 0.3,
    requiresChaining: needsChaining,
    chainOrder,
    contextNeeded: ['estimate'],
    userIntent: message.slice(0, 100),
  };
}

export { CLASSIFICATION_SYSTEM_PROMPT };
