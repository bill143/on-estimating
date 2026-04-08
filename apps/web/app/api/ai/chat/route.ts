// NEXUS ON Estimating — AI Chat API Route (Streaming)
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, messages, userInput, context } = await request.json();

    // Build conversation messages for Claude
    const conversationMessages: Anthropic.MessageParam[] = [];

    // Add conversation history (last 10 messages)
    if (messages && Array.isArray(messages)) {
      for (const msg of messages.slice(-10)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversationMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add the current user input
    const contextStr = context
      ? `\n\nCurrent context:\n- Organization: ${context.organizationId || 'N/A'}\n- Active Estimate: ${context.activeEstimateId || 'none'}\n- Active Project: ${context.activeProjectId || 'none'}\n- Permissions: ${context.permissions?.join(', ') || 'all'}`
      : '';

    const userContent = typeof userInput === 'string'
      ? userInput
      : `User request: ${JSON.stringify(userInput)}${contextStr}`;

    conversationMessages.push({ role: 'user', content: userContent });

    // Build system prompt with construction context
    const fullSystemPrompt = `${systemPrompt || 'You are a helpful AI assistant for construction estimating.'}

You are part of NEXUS ON Estimating, an enterprise construction estimating platform for O'Neill Contractors.
Key facts:
- Federal GC specializing in VA, NAVFAC, USACE, GSA, DHS projects
- 8(a), SDVOSB, WOSB certified
- Uses CSI MasterFormat 16-division coding
- Davis-Bacon prevailing wage compliance required
- All cost calculations use 5 categories: Material, Labor, Equipment, Subcontractor, Other

Always be precise with numbers. Never guess at costs — use data sources or say you need to look it up.
Format currency as USD with no decimals for estimates over $1000, 2 decimals for unit costs.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: fullSystemPrompt,
      messages: conversationMessages,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    return NextResponse.json({
      response: content.text,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Chat failed', details: String(error) },
      { status: 500 }
    );
  }
}
