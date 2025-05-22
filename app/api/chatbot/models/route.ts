import { NextRequest, NextResponse } from 'next/server';

/**
 * List available language models from OpenRouter
 * 
 * GET /api/chatbot/models
 */
export async function GET(_request: NextRequest) {
  try {
    // Define the models available through OpenRouter
    // You can customize this list based on your preferences and needs
    const models = [
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        description: 'OpenAI\'s most powerful model for complex tasks',
        maxTokens: 4096,
      },
      {
        id: 'anthropic/claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        description: 'Fast, affordable AI assistant with strong reasoning',
        maxTokens: 16000,
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        description: 'Anthropic\'s most powerful model for advanced reasoning',
        maxTokens: 32000,
      },
      {
        id: 'mistralai/mistral-large-latest',
        name: 'Mistral Large',
        provider: 'Mistral AI',
        description: 'Mistral\'s flagship model with strong performance',
        maxTokens: 8000,
      },
      {
        id: 'meta-llama/llama-3-70b-instruct',
        name: 'Llama 3 70B',
        provider: 'Meta',
        description: 'Meta\'s open-source large language model',
        maxTokens: 8000,
      }
    ];
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
