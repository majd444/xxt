import { v4 as uuidv4 } from 'uuid';

// Mock Botpress Service (No SDK Required)
// This is a simplified implementation that doesn't require the Botpress SDK

// In-memory storage for conversations and messages (for demo/development only)
const conversations = new Map<string, any>();
const messages = new Map<string, any[]>();

/**
 * Create a new conversation
 * @param userId User identifier
 * @param botId Bot identifier (optional in mock implementation)
 * @returns Conversation object
 */
export async function createConversation(userId: string, botId: string) {
  try {
    const conversationId = uuidv4();
    const conversation = {
      id: conversationId,
      userId,
      botId: botId || 'default-bot',
      createdAt: new Date().toISOString()
    };
    
    conversations.set(conversationId, conversation);
    messages.set(conversationId, []);
    
    return conversation;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    throw error;
  }
}

/**
 * Send a message
 * @param conversationId Conversation identifier
 * @param message Text message to send
 * @returns Response including bot's reply
 */
export async function sendMessage(conversationId: string, message: string) {
  try {
    if (!conversations.has(conversationId)) {
      throw new Error('Conversation not found');
    }

    const userMessage = {
      id: uuidv4(),
      conversationId,
      senderId: 'user',
      text: message,
      createdAt: new Date().toISOString(),
      type: 'text'
    };
    
    // Mock bot response
    const botMessage = {
      id: uuidv4(),
      conversationId,
      senderId: 'bot',
      text: `This is a mock response to: "${message}"`,
      createdAt: new Date().toISOString(),
      type: 'text'
    };
    
    const conversationMessages = messages.get(conversationId) || [];
    conversationMessages.push(userMessage, botMessage);
    messages.set(conversationId, conversationMessages);
    
    return {
      message: botMessage
    };
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

/**
 * Get conversation history
 * @param conversationId Conversation identifier
 * @returns Conversation with messages
 */
export async function getConversation(conversationId: string) {
  try {
    const conversation = conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    const conversationMessages = messages.get(conversationId) || [];
    
    return {
      ...conversation,
      messages: conversationMessages
    };
  } catch (error) {
    console.error('Failed to get conversation:', error);
    throw error;
  }
}

/**
 * Get all conversations for a user
 * @param userId User identifier
 * @returns List of conversations
 */
export async function getUserConversations(userId: string) {
  try {
    const userConversations = Array.from(conversations.values())
      .filter(conv => conv.userId === userId);
    
    return userConversations;
  } catch (error) {
    console.error('Failed to get user conversations:', error);
    throw error;
  }
}

export default {
  createConversation,
  sendMessage,
  getConversation,
  getUserConversations
};