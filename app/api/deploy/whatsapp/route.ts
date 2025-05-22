import { NextRequest, NextResponse } from 'next/server';

/**
 * Deploy a chatbot to WhatsApp
 * 
 * POST /api/deploy/whatsapp
 * Body: { botId: string, botName: string, phoneId: string, token: string, businessId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, botName, phoneId, token, businessId } = body;
    
    if (!phoneId || !token || !businessId) {
      return NextResponse.json({ 
        error: 'Phone ID, access token, and business account ID are required' 
      }, { status: 400 });
    }

    // Validate the token by making a request to the WhatsApp Business API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v17.0/${phoneId}?fields=verified_name,quality_rating`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const whatsappData = await whatsappResponse.json();
    
    if (!whatsappResponse.ok) {
      return NextResponse.json({ 
        error: `Invalid WhatsApp credentials: ${whatsappData.error?.message || 'Unknown error'}` 
      }, { status: 400 });
    }

    // Register the webhook for your WhatsApp number
    // This is a simplified version - in a real implementation, you would need to:
    // 1. Set up a webhook subscription in Meta Developer Portal
    // 2. Implement webhook verification
    // 3. Handle webhook events
    
    const _webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin}/api/webhook/whatsapp/${botId}`;
    
    // Store the bot information in your database
    // This is a placeholder - implement your database storage logic here
    console.log(`Deployed WhatsApp bot: ${botName} (ID: ${botId}) with phone ID: ${phoneId}`);

    // Return success with the phone number details
    return NextResponse.json({ 
      success: true, 
      message: `Successfully deployed ${botName} to WhatsApp!`,
      phoneDetails: {
        name: whatsappData.verified_name,
        quality: whatsappData.quality_rating,
      },
    });
    
  } catch (error: unknown) {
    console.error('Error deploying to WhatsApp:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
}
