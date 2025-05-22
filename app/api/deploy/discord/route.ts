import { NextRequest, NextResponse } from 'next/server';

/**
 * Deploy a chatbot to Discord
 * 
 * POST /api/deploy/discord
 * Body: { botId: string, botName: string, token: string, clientId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, botName, token, clientId } = body;
    
    if (!token || !clientId) {
      return NextResponse.json({ 
        error: 'Discord Bot Token and Client ID are required' 
      }, { status: 400 });
    }

    // Validate the token by making a request to the Discord API
    const discordResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const discordData = await discordResponse.json();
    
    if (!discordResponse.ok) {
      return NextResponse.json({ 
        error: `Invalid Discord token: ${discordData.message || 'Unknown error'}` 
      }, { status: 400 });
    }

    // Generate the OAuth2 URL for adding the bot to a server
    const permissions = 2147483648; // Send Messages permission
    const scopes = 'bot%20applications.commands';
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;

    // Store the bot information in your database
    // This is a placeholder - implement your database storage logic here
    console.log(`Deployed Discord bot: ${botName} (ID: ${botId}) with client ID: ${clientId}`);

    // Return success with the bot details and invite URL
    return NextResponse.json({ 
      success: true, 
      message: `Successfully deployed ${botName} to Discord!`,
      botDetails: {
        username: discordData.username,
        id: discordData.id,
      },
      inviteUrl,
    });
    
  } catch (error: unknown) {
    console.error('Error deploying to Discord:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
}
