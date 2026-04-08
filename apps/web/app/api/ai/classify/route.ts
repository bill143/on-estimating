// NEXUS ON Estimating — AI Intent Classification API Route
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt } = await request.json();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    // Parse the JSON response from Claude
    const classification = JSON.parse(content.text);
    return NextResponse.json(classification);
  } catch (error) {
    console.error('Intent classification error:', error);
    return NextResponse.json(
      { error: 'Classification failed', details: String(error) },
      { status: 500 }
    );
  }
}
