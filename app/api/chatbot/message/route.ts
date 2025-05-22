import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import botpressService from '../../../../lib/services/botpress';
import llmService, { ChatMessage } from '../../../../lib/services/llm';

/**
 * Send a message to a conversation
 * 
 * POST /api/chatbot/message
 * Body: { conversationId: string, message: string, provider?: 'botpress' | 'openai' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, message, provider = 'openai', userId } = body;
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }
    
    if (!message) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }
    
    let response;
    
    if (provider === 'botpress') {
      // Send message to Botpress
      response = await botpressService.sendMessage(conversationId, message);
    } else {
      // Store user message in database
      await query(
        `INSERT INTO messages (conversation_id, sender, content, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [conversationId, 'user', message]
      );
      
      // Get conversation history
      const messagesResult = await query(
        `SELECT * FROM messages 
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversationId]
      );
      
      // Format messages for LLM with proper typing
      const chatMessages: ChatMessage[] = messagesResult.rows.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      } as ChatMessage));
      
      // Add system message at the beginning
      chatMessages.unshift({
        role: 'system',
        content: 'You are a helpful assistant for chatbot automation. You can help users create and manage workflows, extract content, send emails, create calendar events, and more.'
      } as ChatMessage);
      
      // Generate response using LLM
      const llmResponse = await llmService.generateChatCompletion({
        messages: chatMessages,
        userId: userId?.toString(),
        conversationId: conversationId
      });
      
      // Store assistant response in database
      await query(
        `INSERT INTO messages (conversation_id, sender, content, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [conversationId, 'assistant', llmResponse.response]
      );
      
      response = llmResponse.response;
    }
    
    return NextResponse.json({
      success: true,
      message: response
    });
  } catch (error: unknown) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}
