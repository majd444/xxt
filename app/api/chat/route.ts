import { NextResponse } from 'next/server';
import { generateChatCompletion } from '@/lib/services/llm';

export async function POST(req: Request) {
  try {
    const { messages, systemPrompt, temperature = 0.7 } = await req.json();
    
    // Convert messages to the format expected by our LLM service
    const formattedMessages = [
      // Add system prompt if provided
      systemPrompt ? { role: 'system', content: systemPrompt } : null,
      // Add the user messages
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ].filter(Boolean); // Remove null entries
    
    // Call our LLM service that uses the OpenRouter API key from .env
    const result = await generateChatCompletion({
      messages: formattedMessages,
      temperature: parseFloat(temperature)
    });
    
    return NextResponse.json({ 
      response: result.response,
      model: result.model
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
