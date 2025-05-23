import { v4 as uuidv4 } from 'uuid';

// Mock conversation storage
const conversations: Record<string, any> = {};
const messages: Record<string, any[]> = {};

/**
 * Create a new conversation (Mock implementation)
 * @param userId User identifier
 * @param botId Bot identifier
 * @returns Conversation object
 */
export async function createConversation(userId: string, botId: string) {
  try {
    const conversationId = uuidv4();
    const conversation = {
      id: conversationId,
      userId,
      botId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    conversations[conversationId] = conversation;
    messages[conversationId] = [];
    
    return conversation;
  } catch (error) {
    console.error('Failed to create Botpress conversation:', error);
    throw error;
  }
}

/**
 * Send a message to a Botpress conversation
 * @param conversationId Conversation identifier
 * @param message Text message to send
 * @returns Response from the bot
 */
export async function sendMessage(conversationId: string, message: string) {
  try {
    if (!conversations[conversationId]) {
      throw new Error('Conversation not found');
    }
    
    const messageId = uuidv4();
    const newMessage = {
      id: messageId,
      conversationId,
      payload: {
        text: message,
        type: 'text'
      },
      direction: 'incoming',
      createdAt: new Date().toISOString()
    };
    
    // Store the user message
    messages[conversationId].push(newMessage);
    
    // Generate mock bot response
    const botMessageId = uuidv4();
    const botMessage = {
      id: botMessageId,
      conversationId,
      payload: {
        text: `This is a mock response to: "${message}"`,
        type: 'text'
      },
      direction: 'outgoing',
      createdAt: new Date().toISOString()
    };
    
    // Store the bot response
    messages[conversationId].push(botMessage);
    
    // Update conversation timestamp
    conversations[conversationId].updatedAt = new Date().toISOString();
    
    return botMessage;
  } catch (error) {
    console.error('Failed to send message to Botpress:', error);
    throw error;
  }
}

/**
 * Get conversation history from Botpress
 * @param conversationId Conversation identifier
 * @returns Conversation with messages
 */
export async function getConversation(conversationId: string) {
  try {
    if (!conversations[conversationId]) {
      throw new Error('Conversation not found');
    }
    
    return {
      ...conversations[conversationId],
      messages: messages[conversationId] || []
    };
  } catch (error) {
    console.error('Failed to get Botpress conversation:', error);
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
    // Filter conversations by userId
    const userConversations = Object.values(conversations)
      .filter((conv: any) => conv.userId === userId);
    
    return userConversations;
  } catch (error) {
    console.error('Failed to get user conversations from Botpress:', error);
    throw error;
  }
}

export default {
  createConversation,
  sendMessage,
  getConversation,
  getUserConversations
};