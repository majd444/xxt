import { NextRequest, NextResponse } from 'next/server';

/**
 * Telegram webhook handler using query parameters instead of route parameters
 * 
 * POST /api/webhook/telegram-bot?botId=YOUR_BOT_ID
 * Body: Telegram Update object
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');
    
    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }
    
    const update = await request.json();
    
    console.log(`Received Telegram update for bot ${botId}:`, JSON.stringify(update).substring(0, 200) + '...');
    
    // Check if this is a message update
    if (!update.message) {
      return NextResponse.json({ status: 'ok' });
    }
    
    const { message } = update;
    const _chatId = message.chat.id;
    const text = message.text;
    const username = message.from.username;
    
    console.log(`Message from ${username}: ${text}`);
    
    // Process the message with your chatbot
    // This is where you would integrate with your LLM service
    const response = await processMessage(botId, text);
    
    // Send the response back to Telegram
    // In a real implementation, you would retrieve the bot token from your database
    // For this example, we'll just log the response
    console.log(`Response to ${username}: ${response}`);
    
    return NextResponse.json({ status: 'ok' });
  } catch (error: unknown) {
    console.error('Error handling Telegram webhook:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
}

/**
 * Process a message with the chatbot
 * In a real implementation, this would call your LLM service
 */
async function processMessage(botId: string, text: string): Promise<string> {
  // Mock implementation - replace with your actual LLM integration
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
  return `Echo from bot ${botId}: ${text}`;
}
