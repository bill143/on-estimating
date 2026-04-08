// Source: Llama Cookbook — adapted from function-calling agent patterns
// NEXUS ON Estimating — Agent Registry

import type { AgentDefinition, AgentDomain } from '@on/db';

/**
 * Central registry of all domain-specific AI agents.
 * Each agent owns a domain and has specialized skills.
 * Skills are stub definitions in Phase 0 — fleshed out in later phases.
 */
export const AGENT_REGISTRY: AgentDefinition[] = [
  // ─── TAKEOFF AGENT ──────────────────────────────────────────────
  {
    id: 'takeoff-agent',
    name: 'Takeoff Agent',
    domain: 'takeoff',
    description:
      'Handles plan reading, symbol detection, area measurement, BIM extraction, and revision comparison. The eyes of the estimating platform.',
    skills: [
      {
        id: 'plan-reader',
        name: 'Plan Reader',
        description: 'Ingests and processes construction plans (PDF, DWG, IFC). Extracts structured data from plan sheets.',
        parameters: [
          { name: 'file_url', type: 'string', description: 'URL to the plan file in storage', required: true },
          { name: 'file_type', type: 'string', description: 'File format: pdf, dwg, dxf, ifc', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'symbol-detector',
        name: 'Symbol Detector',
        description: 'ML model for auto-counting symbols: doors, windows, fixtures, electrical, plumbing, HVAC components.',
        parameters: [
          { name: 'plan_sheet_id', type: 'string', description: 'Plan sheet to analyze', required: true },
          { name: 'symbol_types', type: 'array', description: 'Types of symbols to detect', required: false },
        ],
        isImplemented: false,
      },
      {
        id: 'area-measurer',
        name: 'Area Measurer',
        description: 'Calculates areas, linear footage, and volumes from plan geometry. Supports architectural and engineering scales.',
        parameters: [
          { name: 'plan_sheet_id', type: 'string', description: 'Plan sheet with geometry', required: true },
          { name: 'measurement_type', type: 'string', description: 'area, linear, volume, count', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'bim-extractor',
        name: 'BIM Extractor',
        description: 'Parses IFC/Revit models for quantity extraction by category (structural, architectural, MEP).',
        parameters: [
          { name: 'model_url', type: 'string', description: 'URL to BIM model file', required: true },
          { name: 'categories', type: 'array', description: 'Element categories to extract', required: false },
        ],
        isImplemented: false,
      },
      {
        id: 'revision-detector',
        name: 'Revision Detector',
        description: 'Compares plan revisions and highlights quantity changes with delta analysis.',
        parameters: [
          { name: 'plan_v1_id', type: 'string', description: 'Original plan version', required: true },
          { name: 'plan_v2_id', type: 'string', description: 'Updated plan version', required: true },
        ],
        isImplemented: false,
      },
      {
        id: '4way-validate',
        name: '4-Way Validation',
        description: 'Cross-validates takeoff quantities using 4 methods: Claude primary, OpenAI verification, geometric calculation, historical reasonableness.',
        parameters: [
          { name: 'quantities', type: 'object', description: 'Extracted quantities to validate', required: true },
          { name: 'project_type', type: 'string', description: 'Building type for historical comparison', required: false },
        ],
        isImplemented: false,
      },
    ],
    canChainTo: ['pricing-agent', 'analytics-agent'],
    contextRequired: ['plan', 'estimate'],
    systemPrompt: `You are the Takeoff Agent for NEXUS ON Estimating. Your role is to analyze construction plans and extract accurate quantities. You specialize in reading architectural, structural, and MEP drawings. Always provide confidence scores with your extractions. Flag items below 90% confidence for human review.`,
    isActive: true,
  },

  // ─── PRICING AGENT ──────────────────────────────────────────────
  {
    id: 'pricing-agent',
    name: 'Pricing Agent',
    domain: 'pricing',
    description:
      'Handles live pricing, RSMeans lookups, assembly building, cost escalation forecasting, and regional adjustments.',
    skills: [
      {
        id: 'live-price-fetcher',
        name: 'Live Price Fetcher',
        description: 'Pulls real-time pricing from supplier APIs (HD Supply, ABC Supply, Ferguson, Graybar).',
        parameters: [
          { name: 'material_description', type: 'string', description: 'Material to price', required: true },
          { name: 'zip_code', type: 'string', description: 'Project location', required: false },
        ],
        isImplemented: false,
      },
      {
        id: 'rsmeans-lookup',
        name: 'RSMeans Lookup',
        description: 'Queries RSMeans/Craftsman databases for unit costs (labor, material, equipment rates) by CSI code.',
        parameters: [
          { name: 'csi_code', type: 'string', description: 'CSI MasterFormat code', required: true },
          { name: 'region_code', type: 'string', description: 'Geographic region for adjustment', required: false },
        ],
        isImplemented: false,
      },
      {
        id: 'assembly-builder',
        name: 'Assembly Builder',
        description: 'Composes complex assemblies from sub-components with parametric inputs.',
        parameters: [
          { name: 'assembly_type', type: 'string', description: 'Type of assembly to build', required: true },
          { name: 'parameters', type: 'object', description: 'Parametric inputs (height, spacing, etc.)', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'escalation-forecaster',
        name: 'Escalation Forecaster',
        description: 'Predicts future material costs based on market trends and historical data.',
        parameters: [
          { name: 'material_type', type: 'string', description: 'Material category', required: true },
          { name: 'forecast_months', type: 'number', description: 'How many months to forecast', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'regional-adjuster',
        name: 'Regional Adjuster',
        description: 'Applies geographic cost multipliers based on project location zip code.',
        parameters: [
          { name: 'base_cost', type: 'number', description: 'Base cost to adjust', required: true },
          { name: 'zip_code', type: 'string', description: 'Project zip code', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'ml-pred',
        name: 'ML Cost Predictor',
        description: 'Random Forest model that validates line item costs against predicted ranges. Flags outliers.',
        parameters: [
          { name: 'line_items', type: 'array', description: 'Line items to validate', required: true },
          { name: 'project_type', type: 'string', description: 'Building type for model context', required: false },
        ],
        isImplemented: false,
      },
    ],
    canChainTo: ['analytics-agent'],
    contextRequired: ['estimate', 'cost_item'],
    systemPrompt: `You are the Pricing Agent for NEXUS ON Estimating. Your role is to provide accurate, current pricing for construction materials, labor, and equipment. Always cite your data source (RSMeans, supplier API, historical). Flag prices that deviate more than 15% from historical norms.`,
    isActive: true,
  },

  // ─── BID MANAGEMENT AGENT ──────────────────────────────────────
  {
    id: 'bid-agent',
    name: 'Bid Management Agent',
    domain: 'bid',
    description:
      'Handles bid reading, bid leveling, ITB generation, subcontractor matching, and scope gap detection.',
    skills: [
      {
        id: 'bid-reader',
        name: 'Bid Reader',
        description: 'Extracts scope, exclusions, and pricing from subcontractor bid PDFs and emails.',
        parameters: [
          { name: 'document_url', type: 'string', description: 'URL to the bid document', required: true },
          { name: 'trade_code', type: 'string', description: 'Expected trade/CSI division', required: false },
        ],
        isImplemented: false,
      },
      {
        id: 'bid-leveler',
        name: 'Bid Leveler',
        description: 'Normalizes bids for apples-to-apples comparison. Identifies scope gaps and applies plug numbers.',
        parameters: [
          { name: 'bid_scope_id', type: 'string', description: 'Scope to level across bids', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'itb-generator',
        name: 'ITB Generator',
        description: 'Auto-generates invitation to bid packages with relevant plan sheets and scope descriptions.',
        parameters: [
          { name: 'project_id', type: 'string', description: 'Project to generate ITB for', required: true },
          { name: 'trade_codes', type: 'array', description: 'Trades to invite', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'sub-matcher',
        name: 'Sub Matcher',
        description: 'Scores and ranks subcontractors by fit: location, trade, history, capacity, prequalification.',
        parameters: [
          { name: 'trade_code', type: 'string', description: 'Required trade code', required: true },
          { name: 'project_zip', type: 'string', description: 'Project location', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'scope-gap-detector',
        name: 'Scope Gap Detector',
        description: 'Identifies missing coverage across all received bids for a scope item.',
        parameters: [
          { name: 'bid_scope_id', type: 'string', description: 'Scope to check for gaps', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'rfq-gen',
        name: 'RFQ Generator',
        description: 'Generates request for quote documents from estimate scope items.',
        parameters: [
          { name: 'estimate_id', type: 'string', description: 'Estimate to generate RFQ from', required: true },
          { name: 'scope_items', type: 'array', description: 'Specific items for the RFQ', required: true },
        ],
        isImplemented: false,
      },
    ],
    canChainTo: ['pricing-agent', 'analytics-agent'],
    contextRequired: ['bid', 'project', 'estimate'],
    systemPrompt: `You are the Bid Management Agent for NEXUS ON Estimating. Your role is to help GCs manage subcontractor bids efficiently. When leveling bids, always normalize to a common scope baseline and flag outliers. Prioritize scope completeness over price alone.`,
    isActive: true,
  },

  // ─── ANALYTICS AGENT ───────────────────────────────────────────
  {
    id: 'analytics-agent',
    name: 'Analytics Agent',
    domain: 'analytics',
    description:
      'Handles profitability prediction, what-if scenarios, proposal generation, and trend analysis.',
    skills: [
      {
        id: 'profitability-predictor',
        name: 'Profitability Predictor',
        description: 'Compares current bid structure to historical outcomes. Surfaces risk areas and margin drift.',
        parameters: [
          { name: 'estimate_id', type: 'string', description: 'Estimate to analyze', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'what-if-engine',
        name: 'What-If Engine',
        description: 'Duplicates estimates and swaps materials/methods for side-by-side comparison of up to 4 scenarios.',
        parameters: [
          { name: 'estimate_id', type: 'string', description: 'Base estimate', required: true },
          { name: 'swap_type', type: 'string', description: 'material, method, or scope', required: true },
          { name: 'swap_details', type: 'object', description: 'What to swap and replacement', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'proposal-gen',
        name: 'Proposal Generator',
        description: 'Produces branded, white-labeled client proposals from estimate data.',
        parameters: [
          { name: 'estimate_id', type: 'string', description: 'Estimate to generate proposal from', required: true },
          { name: 'template_id', type: 'string', description: 'Proposal template to use', required: false },
        ],
        isImplemented: false,
      },
      {
        id: 'trend-analyzer',
        name: 'Trend Analyzer',
        description: 'Tracks win/loss patterns, cost trends, and margin drift across projects.',
        parameters: [
          { name: 'time_range', type: 'string', description: 'Analysis period (30d, 90d, 1y)', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'cost-compare',
        name: 'Cost Comparator',
        description: 'Compares costs between estimate revisions, projects, or time periods with visual diff.',
        parameters: [
          { name: 'source_id', type: 'string', description: 'Source estimate/version', required: true },
          { name: 'target_id', type: 'string', description: 'Target estimate/version to compare', required: true },
        ],
        isImplemented: false,
      },
    ],
    canChainTo: [],
    contextRequired: ['estimate', 'project'],
    systemPrompt: `You are the Analytics Agent for NEXUS ON Estimating. Your role is to provide data-driven insights that help estimators make profitable decisions. Always cite specific historical projects and data points. Quantify risk in dollar terms when possible.`,
    isActive: true,
  },

  // ─── COMPLIANCE AGENT ──────────────────────────────────────────
  {
    id: 'compliance-agent',
    name: 'Compliance Agent',
    domain: 'compliance',
    description:
      'Handles COI monitoring, tax calculation, audit logging, and Davis-Bacon prevailing wage compliance.',
    skills: [
      {
        id: 'coi-monitor',
        name: 'COI Monitor',
        description: 'Tracks certificate of insurance expiration dates and coverage limits. Alerts on expiring COIs.',
        parameters: [
          { name: 'subcontractor_id', type: 'string', description: 'Sub to check COI for', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'tax-calculator',
        name: 'Tax Calculator',
        description: 'Applies jurisdiction-specific sales tax rules based on project location and material types.',
        parameters: [
          { name: 'zip_code', type: 'string', description: 'Project zip code', required: true },
          { name: 'material_amount', type: 'number', description: 'Taxable material amount', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'audit-logger',
        name: 'Audit Logger',
        description: 'Maintains immutable audit trail for all estimate changes. Required for federal compliance.',
        parameters: [
          { name: 'entity_type', type: 'string', description: 'Type of entity changed', required: true },
          { name: 'entity_id', type: 'string', description: 'ID of changed entity', required: true },
          { name: 'action', type: 'string', description: 'Type of change', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'davis-bacon',
        name: 'Davis-Bacon Checker',
        description: 'Validates labor rates against prevailing wage requirements. Flags non-compliant rates.',
        parameters: [
          { name: 'trade_code', type: 'string', description: 'Trade/craft classification', required: true },
          { name: 'county', type: 'string', description: 'County for wage determination', required: true },
          { name: 'proposed_rate', type: 'number', description: 'Proposed hourly rate', required: true },
        ],
        isImplemented: false,
      },
    ],
    canChainTo: [],
    contextRequired: ['estimate', 'project'],
    systemPrompt: `You are the Compliance Agent for NEXUS ON Estimating. Your role is to ensure all estimates meet federal construction compliance requirements including Davis-Bacon prevailing wages, FAR regulations, and EM 385-1-1 safety documentation. Zero tolerance for compliance gaps.`,
    isActive: true,
  },

  // ─── COLLABORATION AGENT ───────────────────────────────────────
  {
    id: 'collaboration-agent',
    name: 'Collaboration Agent',
    domain: 'collaboration',
    description:
      'Handles conflict resolution, notification routing, permission enforcement, and version control.',
    skills: [
      {
        id: 'conflict-resolver',
        name: 'Conflict Resolver',
        description: 'Detects and resolves simultaneous edit conflicts using CRDT merge strategies.',
        parameters: [
          { name: 'estimate_id', type: 'string', description: 'Estimate with conflict', required: true },
          { name: 'conflicting_changes', type: 'array', description: 'The conflicting edits', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'notify-router',
        name: 'Notification Router',
        description: 'Sends contextual alerts to the right team members based on event type and their role.',
        parameters: [
          { name: 'event_type', type: 'string', description: 'Type of event', required: true },
          { name: 'entity_id', type: 'string', description: 'Related entity', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'permission-enforcer',
        name: 'Permission Enforcer',
        description: 'Validates that the current user has permission for the requested action.',
        parameters: [
          { name: 'action', type: 'string', description: 'Action to validate', required: true },
          { name: 'entity_id', type: 'string', description: 'Target entity', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'version-controller',
        name: 'Version Controller',
        description: 'Manages estimate versions with diff, snapshot, and rollback capabilities.',
        parameters: [
          { name: 'estimate_id', type: 'string', description: 'Estimate to version', required: true },
          { name: 'action', type: 'string', description: 'snapshot, diff, or rollback', required: true },
        ],
        isImplemented: false,
      },
      {
        id: 'presence-tracker',
        name: 'Presence Tracker',
        description: 'Tracks which users are actively viewing/editing which estimates in real-time.',
        parameters: [
          { name: 'estimate_id', type: 'string', description: 'Estimate to track', required: true },
        ],
        isImplemented: false,
      },
    ],
    canChainTo: [],
    contextRequired: ['estimate'],
    systemPrompt: `You are the Collaboration Agent for NEXUS ON Estimating. Your role is to facilitate multi-user workflows, resolve conflicts, and manage estimate versioning. Always preserve data integrity and provide clear audit trails for all changes.`,
    isActive: true,
  },
];

/** Get an agent definition by ID */
export function getAgent(agentId: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.id === agentId);
}

/** Get an agent by domain */
export function getAgentByDomain(domain: AgentDomain): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.domain === domain);
}

/** Get all active agents */
export function getActiveAgents(): AgentDefinition[] {
  return AGENT_REGISTRY.filter((a) => a.isActive);
}

/** Get the chain of agents for a multi-step workflow */
export function getAgentChain(startAgentId: string): AgentDefinition[] {
  const chain: AgentDefinition[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = startAgentId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const agent = getAgent(currentId);
    if (agent) {
      chain.push(agent);
      currentId = agent.canChainTo[0]; // follow the primary chain
    } else {
      break;
    }
  }

  return chain;
}
