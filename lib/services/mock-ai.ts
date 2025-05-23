/**
 * Simple mock implementation to replace the AI package functionality
 * This avoids dependency issues by providing a local implementation
 */

// Mock function to simulate AI chat response
export function createMockChatCompletion(messages: any[]) {
  // Get the last user message
  const lastUserMessage = messages.length > 0 
    ? messages[messages.length - 1].content 
    : "Hello";

  // Generate a simple response based on the user's message
  const response = `This is a mock AI response to: "${lastUserMessage}"`;
  
  return {
    id: `mock-${Date.now()}`,
    content: response,
    role: 'assistant',
    createdAt: new Date().toISOString()
  };
}

// Mock streaming response
export function createMockStreamingChatCompletion(messages: any[]) {
  // This would normally return a stream, but we'll simulate it with a promise
  return Promise.resolve({
    content: createMockChatCompletion(messages).content
  });
}

export default {
  createChatCompletion: createMockChatCompletion,
  createStreamingChatCompletion: createMockStreamingChatCompletion
};
