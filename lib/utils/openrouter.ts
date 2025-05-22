/**
 * Utility functions for working with OpenRouter API
 */

/**
 * Fetch available models from the API
 */
export async function fetchModels() {
  try {
    const response = await fetch('/api/chatbot/models');
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    const data = await response.json();
    return data.models;
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

/**
 * Get a model's display information by ID
 * @param modelId The model ID from OpenRouter
 */
export function getModelInfo(modelId: string) {
  const defaultInfo = {
    name: modelId.split('/').pop() || modelId,
    provider: modelId.split('/')[0] || 'Unknown',
    description: 'Language model',
    maxTokens: 4096,
  };

  return defaultInfo;
}

/**
 * Format model ID for display
 * @param modelId The model ID from OpenRouter
 */
export function formatModelName(modelId: string) {
  if (!modelId) return 'Unknown Model';
  
  // Extract the part after the slash if it exists (e.g., 'openai/gpt-4-turbo' -> 'gpt-4-turbo')
  const name = modelId.split('/').pop() || modelId;
  
  // Format the name nicely
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace('Gpt', 'GPT');
}
