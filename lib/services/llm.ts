
import { OpenAI } from 'openai';
import { query } from '../db';

// Initialize OpenAI client for OpenRouter
const openaiClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', // Required for OpenRouter API
    'X-Title': 'Chatbot Automation', // Your app's name
  },
  defaultQuery: {
    // OpenRouter-specific features via query parameters
    'route': 'fallback', // Use fallback routing if preferred provider is down
    'transforms': 'middle-out', // Use OpenRouter optimizations
  }
});

// Available models on OpenRouter
const OPENROUTER_MODELS = {
  GPT4_TURBO: 'openai/gpt-4-turbo',
  CLAUDE_3_5_SONNET: 'anthropic/claude-3-5-sonnet',
  CLAUDE_3_OPUS: 'anthropic/claude-3-opus',
  MISTRAL_LARGE: 'mistralai/mistral-large-latest',
  // Add other models as needed
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  conversationId?: string;
}

/**
 * Generate a response using the OpenRouter API (which routes to various LLMs)
 * @param options Chat completion options
 */
export async function generateChatCompletion(options: ChatCompletionOptions) {
  try {
    const defaultModel = OPENROUTER_MODELS.GPT4_TURBO;
    
    const response = await openaiClient.chat.completions.create({
      model: options.model || defaultModel,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
      user: options.userId,
    });
    
    // Log the interaction if conversation ID is provided
    if (options.conversationId) {
      await logInteraction(
        options.conversationId,
        options.messages[options.messages.length - 1].content,
        response.choices[0].message.content || '',
        options.model || defaultModel
      );
    }
    
    return {
      response: response.choices[0].message.content,
      model: options.model || defaultModel,
      usage: response.usage,
    };
  } catch (error) {
    console.error('Error generating chat completion:', error);
    throw error;
  }
}

/**
 * Log an AI interaction in the database
 */
async function logInteraction(
  conversationId: string,
  userMessage: string,
  aiResponse: string,
  model: string
) {
  try {
    await query(
      `INSERT INTO ai_interactions 
       (conversation_id, user_message, ai_response, model, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [conversationId, userMessage, aiResponse, model]
    );
  } catch (error) {
    console.error('Error logging AI interaction:', error);
    // Continue despite logging error
  }
}

/**
 * Extract key information from a text using AI
 * @param text The text to analyze
 * @param extractionPrompt Specific instructions for what to extract
 */
export async function extractInformation(text: string, extractionPrompt: string) {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an AI assistant specialized in extracting structured information from text. 
                  Extract the information according to the following instructions and return it as a JSON object.
                  ${extractionPrompt}`
      },
      {
        role: 'user',
        content: text
      }
    ];
    
    const response = await openaiClient.chat.completions.create({
      model: OPENROUTER_MODELS.GPT4_TURBO,
      messages,
      temperature: 0.1, // Lower temperature for more deterministic outputs
      response_format: { type: 'json_object' },
    });
    
    // Parse JSON response
    const jsonResponse = JSON.parse(response.choices[0].message.content || '{}');
    
    return jsonResponse;
  } catch (error) {
    console.error('Error extracting information:', error);
    throw error;
  }
}

/**
 * Generate a workflow suggestion based on user inputs
 * @param task Description of the task to automate
 * @param availableIntegrations List of available integrations
 */
export async function generateWorkflowSuggestion(task: string, availableIntegrations: string[]) {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a workflow automation expert. Create a workflow suggestion for the following task 
                  using only the available integrations. Return the result as a JSON object with steps array, 
                  where each step has a name, description, and integration field.`
      },
      {
        role: 'user',
        content: `Task: ${task}\nAvailable integrations: ${availableIntegrations.join(', ')}`
      }
    ];
    
    const response = await openaiClient.chat.completions.create({
      model: OPENROUTER_MODELS.GPT4_TURBO,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });
    
    // Parse JSON response
    const jsonResponse = JSON.parse(response.choices[0].message.content || '{}');
    
    return jsonResponse;
  } catch (error) {
    console.error('Error generating workflow suggestion:', error);
    throw error;
  }
}

export default {
  generateChatCompletion,
  extractInformation,
  generateWorkflowSuggestion,
};
