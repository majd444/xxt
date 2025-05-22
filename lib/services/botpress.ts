import axios from 'axios';

// Botpress API configuration
const BOTPRESS_API_URL = process.env.BOTPRESS_API_URL || 'https://api.botpress.cloud';
const BOTPRESS_API_TOKEN = process.env.BOTPRESS_API_TOKEN;

// Botpress API configuration

// Create Botpress API client
const botpressClient = axios.create({
  baseURL: BOTPRESS_API_URL,
  headers: {
    'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Create a new conversation in Botpress
 * @param userId User identifier
 * @param botId Bot identifier
 * @returns Conversation object
 */
export async function createConversation(userId: string, botId: string) {
  try {
    const response = await botpressClient.post('/v1/conversations', {
      userId,
      botId
    });
    
    return response.data;
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
    const response = await botpressClient.post(`/v1/conversations/${conversationId}/messages`, {
      type: 'text',
      payload: {
        text: message
      }
    });
    
    return response.data;
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
    const response = await botpressClient.get(`/v1/conversations/${conversationId}`);
    return response.data;
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
    const response = await botpressClient.get(`/v1/users/${userId}/conversations`);
    return response.data;
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