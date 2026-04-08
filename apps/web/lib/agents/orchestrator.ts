// Source: Llama Cookbook — adapted from multi-agent orchestration patterns
// NEXUS ON Estimating — Orchestrator AI (The Brain)

import type {
  AgentContext,
  AgentResult,
  AgentDomain,
  IntentClassification,
  AIMessage,
} from '@on/db';
import { getAgentByDomain } from './registry';
import { classifyIntent } from './intent-classifier';

export interface OrchestratorResponse {
  message: string;
  agentResults: AgentStepResult[];
  totalDurationMs: number;
  confidence: number;
  sources: Array<{ type: string; label: string; reference?: string }>;
  actions: Array<{ type: string; entity: string; description: string }>;
}

interface AgentStepResult {
  agentId: string;
  agentName: string;
  domain: AgentDomain;
  skillUsed: string;
  result: AgentResult;
  durationMs: number;
}

/**
 * The Orchestrator coordinates the entire AI pipeline:
 * 1. Classify user intent
 * 2. Route to appropriate agent(s)
 * 3. Execute agent chain if multi-step
 * 4. Compile response
 * 5. Log all actions for audit trail
 */
export class Orchestrator {
  private context: AgentContext;
  private conversationHistory: AIMessage[] = [];

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Process a user message through the full orchestration pipeline.
   */
  async processMessage(userMessage: string, pageContext?: string): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const results: AgentStepResult[] = [];

    // Step 1: Classify intent
    const intent = await classifyIntent(userMessage, this.context, pageContext);

    // Step 2: Execute agent chain
    if (intent.requiresChaining && intent.chainOrder.length > 1) {
      // Multi-agent chaining
      let chainInput: unknown = { userMessage, intent };

      for (const domain of intent.chainOrder) {
        const stepResult = await this.executeAgent(domain, chainInput);
        results.push(stepResult);

        // Pass output to next agent in chain
        if (stepResult.result.chainTo && stepResult.result.chainInput) {
          chainInput = stepResult.result.chainInput;
        } else {
          chainInput = stepResult.result.data;
        }
      }
    } else {
      // Single agent execution
      const stepResult = await this.executeAgent(intent.primaryAgent, { userMessage, intent });
      results.push(stepResult);
    }

    // Step 3: Compile response
    const response = this.compileResponse(results, intent, Date.now() - startTime);

    // Step 4: Log to conversation history
    this.conversationHistory.push(
      { id: crypto.randomUUID(), conversation_id: '', role: 'user', content: userMessage, agent_id: null, skill_id: null, tool_calls: null, metadata: {}, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), conversation_id: '', role: 'assistant', content: response.message, agent_id: intent.primaryAgent, skill_id: null, tool_calls: null, metadata: { results: results.length, confidence: response.confidence }, created_at: new Date().toISOString() }
    );

    return response;
  }

  /**
   * Execute a single agent with the given input.
   */
  private async executeAgent(domain: AgentDomain, input: unknown): Promise<AgentStepResult> {
    const startTime = Date.now();
    const agent = getAgentByDomain(domain);

    if (!agent) {
      return {
        agentId: 'unknown',
        agentName: 'Unknown Agent',
        domain,
        skillUsed: 'none',
        result: {
          success: false,
          message: `No agent registered for domain: ${domain}`,
        },
        durationMs: Date.now() - startTime,
      };
    }

    // In Phase 0, agents return stub responses.
    // In later phases, each agent will have real skill implementations.
    const result = await this.executeAgentStub(agent.id, domain, input);

    return {
      agentId: agent.id,
      agentName: agent.name,
      domain,
      skillUsed: result.skillUsed || 'general',
      result: result.result,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Phase 0 stub: agents acknowledge the request and describe what they would do.
   * Real implementations are wired in Phases 1-6.
   */
  private async executeAgentStub(
    agentId: string,
    domain: AgentDomain,
    input: unknown
  ): Promise<{ skillUsed: string; result: AgentResult }> {
    const agent = getAgentByDomain(domain);
    const skills = agent?.skills.map((s) => s.name).join(', ') || 'none';

    // Call the AI API to generate a contextual response using the agent's system prompt
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: agent?.systemPrompt || '',
          messages: this.conversationHistory.slice(-10),
          userInput: input,
          context: this.context,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          skillUsed: 'ai-chat',
          result: {
            success: true,
            data: data.response,
            message: data.response,
            confidence: 0.8,
            sources: [{ type: 'ai', label: `${agent?.name} (${domain})` }],
          },
        };
      }
    } catch {
      // Fall through to stub response
    }

    return {
      skillUsed: 'stub',
      result: {
        success: true,
        message: `[${agent?.name}] I understand your request. My available skills are: ${skills}. This capability will be fully implemented in the next phase. How else can I help with your estimate?`,
        confidence: 0.5,
        sources: [{ type: 'ai', label: `${agent?.name} (Phase 0 stub)` }],
      },
    };
  }

  /**
   * Compile agent results into a unified response.
   */
  private compileResponse(
    results: AgentStepResult[],
    intent: IntentClassification,
    totalDurationMs: number
  ): OrchestratorResponse {
    const messages = results.map((r) => r.result.message).filter(Boolean);
    const allSources = results.flatMap((r) => r.result.sources || []);
    const allActions = results.flatMap((r) => r.result.actions || []);
    const avgConfidence =
      results.reduce((acc, r) => acc + (r.result.confidence || 0), 0) / results.length;

    return {
      message: messages.join('\n\n'),
      agentResults: results,
      totalDurationMs,
      confidence: avgConfidence || intent.confidence,
      sources: allSources,
      actions: allActions,
    };
  }

  /** Update the orchestrator's context */
  setContext(updates: Partial<AgentContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /** Get conversation history */
  getHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  /** Clear conversation history */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}
