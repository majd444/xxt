import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import botpressService from '../../../../lib/services/botpress';

/**
 * Create a new conversation
 * 
 * POST /api/chatbot/conversation
 * Body: { userId: string, provider?: 'botpress' | 'openai', botId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, provider = 'openai', botId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    let conversationId;
    
    if (provider === 'botpress') {
      if (!botId) {
        return NextResponse.json({ error: 'Bot ID is required for Botpress' }, { status: 400 });
      }
      
      // Create conversation in Botpress
      const conversation = await botpressService.createConversation(userId, botId);
      conversationId = conversation.id;
    } else {
      // Create conversation in our database for OpenAI/other LLMs
      const result = await query(
        `INSERT INTO conversations (user_id, title, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, 'New Conversation']
      );
      
      conversationId = result.rows[0].id;
    }
    
    return NextResponse.json({
      success: true,
      conversationId,
      provider
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Get conversation history
 * 
 * GET /api/chatbot/conversation?conversationId={id}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const provider = searchParams.get('provider') || 'openai';
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }
    
    if (provider === 'botpress') {
      // Get conversation from Botpress
      const conversation = await botpressService.getConversation(conversationId);
      return NextResponse.json({ success: true, conversation });
    } else {
      // Get conversation from our database
      const messagesResult = await query(
        `SELECT * FROM messages 
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversationId]
      );
      
      const conversationResult = await query(
        'SELECT * FROM conversations WHERE id = $1',
        [conversationId]
      );
      
      if (conversationResult.rows.length === 0) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        conversation: conversationResult.rows[0],
        messages: messagesResult.rows
      });
    }
  } catch (error: unknown) {
    console.error('Error getting conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
