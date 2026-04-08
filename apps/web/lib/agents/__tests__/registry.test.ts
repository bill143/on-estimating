// NEXUS ON Estimating — Agent Registry Unit Tests
import { AGENT_REGISTRY, getAgent, getAgentByDomain, getActiveAgents, getAgentChain } from '../registry';

describe('Agent Registry', () => {
  it('has 6 domain agents registered', () => {
    expect(AGENT_REGISTRY).toHaveLength(6);
  });

  it('covers all 6 domains', () => {
    const domains = AGENT_REGISTRY.map((a) => a.domain);
    expect(domains).toContain('takeoff');
    expect(domains).toContain('pricing');
    expect(domains).toContain('bid');
    expect(domains).toContain('analytics');
    expect(domains).toContain('compliance');
    expect(domains).toContain('collaboration');
  });

  it('getAgent returns correct agent by ID', () => {
    const agent = getAgent('takeoff-agent');
    expect(agent).toBeDefined();
    expect(agent!.name).toBe('Takeoff Agent');
    expect(agent!.domain).toBe('takeoff');
  });

  it('getAgent returns undefined for unknown ID', () => {
    expect(getAgent('nonexistent')).toBeUndefined();
  });

  it('getAgentByDomain returns correct agent', () => {
    const agent = getAgentByDomain('pricing');
    expect(agent).toBeDefined();
    expect(agent!.id).toBe('pricing-agent');
  });

  it('all agents are active', () => {
    const active = getActiveAgents();
    expect(active).toHaveLength(6);
  });

  describe('Agent Skills', () => {
    it('takeoff agent has 6 skills', () => {
      const agent = getAgent('takeoff-agent');
      expect(agent!.skills).toHaveLength(6);
    });

    it('pricing agent has 6 skills', () => {
      const agent = getAgent('pricing-agent');
      expect(agent!.skills).toHaveLength(6);
    });

    it('bid agent has 6 skills', () => {
      const agent = getAgent('bid-agent');
      expect(agent!.skills).toHaveLength(6);
    });

    it('all skills have required fields', () => {
      for (const agent of AGENT_REGISTRY) {
        for (const skill of agent.skills) {
          expect(skill.id).toBeTruthy();
          expect(skill.name).toBeTruthy();
          expect(skill.description).toBeTruthy();
          expect(Array.isArray(skill.parameters)).toBe(true);
          expect(typeof skill.isImplemented).toBe('boolean');
        }
      }
    });

    it('all skills are marked as not implemented in Phase 0', () => {
      for (const agent of AGENT_REGISTRY) {
        for (const skill of agent.skills) {
          expect(skill.isImplemented).toBe(false);
        }
      }
    });
  });

  describe('Agent Chaining', () => {
    it('takeoff can chain to pricing and analytics', () => {
      const agent = getAgent('takeoff-agent');
      expect(agent!.canChainTo).toContain('pricing-agent');
      expect(agent!.canChainTo).toContain('analytics-agent');
    });

    it('pricing can chain to analytics', () => {
      const agent = getAgent('pricing-agent');
      expect(agent!.canChainTo).toContain('analytics-agent');
    });

    it('analytics is a terminal agent (no chaining)', () => {
      const agent = getAgent('analytics-agent');
      expect(agent!.canChainTo).toHaveLength(0);
    });

    it('getAgentChain builds correct chain from takeoff', () => {
      const chain = getAgentChain('takeoff-agent');
      expect(chain.length).toBeGreaterThanOrEqual(1);
      expect(chain[0].id).toBe('takeoff-agent');
      // Chain follows canChainTo[0]: takeoff → pricing → analytics
      if (chain.length >= 2) {
        expect(chain[1].id).toBe('pricing-agent');
      }
    });
  });

  describe('Agent System Prompts', () => {
    it('all agents have system prompts', () => {
      for (const agent of AGENT_REGISTRY) {
        expect(agent.systemPrompt).toBeTruthy();
        expect(agent.systemPrompt.length).toBeGreaterThan(50);
      }
    });

    it('system prompts reference NEXUS ON Estimating', () => {
      for (const agent of AGENT_REGISTRY) {
        expect(agent.systemPrompt).toContain('NEXUS ON Estimating');
      }
    });
  });
});
