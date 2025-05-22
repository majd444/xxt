import { NextRequest, NextResponse } from 'next/server';

/**
 * Deploy a chatbot to Telegram
 * 
 * POST /api/deploy/telegram
 * Body: { botId: string, botName: string, token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, botName, token } = body;
    
    if (!token) {
      return NextResponse.json({ error: 'Telegram Bot Token is required' }, { status: 400 });
    }

    // Validate the token by making a request to the Telegram API
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const telegramData = await telegramResponse.json();
    
    if (!telegramResponse.ok) {
      return NextResponse.json({ 
        error: `Invalid Telegram token: ${telegramData.description || 'Unknown error'}` 
      }, { status: 400 });
    }

    // Set up the webhook to your API endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/api/webhook/telegram/${botId}`;
    
    const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: true,
      }),
    });
    
    const webhookData = await webhookResponse.json();
    
    if (!webhookResponse.ok || !webhookData.ok) {
      return NextResponse.json({ 
        error: `Failed to set webhook: ${webhookData.description || 'Unknown error'}` 
      }, { status: 500 });
    }

    // Store the bot information in your database
    // This is a placeholder - implement your database storage logic here
    console.log(`Deployed Telegram bot: ${botName} (ID: ${botId}) with token: ${token.substring(0, 5)}...`);

    // Return success with the bot username
    return NextResponse.json({ 
      success: true, 
      message: `Successfully deployed ${botName} to Telegram!`,
      username: telegramData.result.username,
    });
    
  } catch (error: unknown) {
    console.error('Error deploying to Telegram:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
}
