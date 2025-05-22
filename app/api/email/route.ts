import { NextRequest, NextResponse } from 'next/server';
import emailService from '../../../lib/services/email';

/**
 * Send an email
 * 
 * POST /api/email/send
 * Body: { userId: number, to: string | string[], subject: string, text?: string, html?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, to, subject, text, html } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    if (!to) {
      return NextResponse.json({ error: 'Recipient(s) required' }, { status: 400 });
    }
    
    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    
    if (!text && !html) {
      return NextResponse.json({ error: 'Either text or HTML content is required' }, { status: 400 });
    }
    
    // Send email
    const result = await emailService.sendMicrosoftEmail(userId, {
      to,
      subject,
      text,
      html
    });
    
    return NextResponse.json({
      success: true,
      messageId: result.messageId
    });
  } catch (error: unknown) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}

/**
 * Get user emails
 * 
 * GET /api/email?userId={id}&folder={folder}&limit={limit}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const folder = searchParams.get('folder') || 'inbox';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get emails
    const emails = await emailService.getEmails(parseInt(userId), folder, limit);
    
    return NextResponse.json({
      success: true,
      emails
    });
  } catch (error: unknown) {
    console.error('Error getting emails:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}
