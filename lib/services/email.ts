import axios from 'axios';
import nodemailer from 'nodemailer';
import { query } from '../db';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Create a transporter for Microsoft OAuth email
 * @param accessToken OAuth access token for Microsoft
 * @param userEmail The email address of the authenticated user
 */
function createMicrosoftTransport(accessToken: string, userEmail: string) {
  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      type: 'OAuth2',
      user: userEmail,
      accessToken,
    },
  });
}

/**
 * Send an email using Microsoft OAuth
 * @param userId The user ID in the database
 * @param options Email options including recipients, subject, and content
 */
export async function sendMicrosoftEmail(userId: number, options: EmailOptions) {
  try {
    // Get user's access token from the database
    const userResult = await query(
      'SELECT email, access_token, token_expires_at FROM users WHERE id = $1 AND provider = $2',
      [userId, 'microsoft']
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found or not authenticated with Microsoft');
    }
    
    const user = userResult.rows[0];
    
    // Check if token is expired
    const tokenExpiry = new Date(user.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      throw new Error('Microsoft access token has expired. Please re-authenticate.');
    }
    
    // Create transporter
    const transporter = createMicrosoftTransport(user.access_token, user.email);
    
    // Send email
    const result = await transporter.sendMail({
      from: user.email,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });
    
    // Log the email sending in the database
    await query(
      `INSERT INTO email_logs (user_id, recipient, subject, status, message_id, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId, Array.isArray(options.to) ? options.to.join(',') : options.to, options.subject, 'sent', result.messageId]
    );
    
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: unknown) {
    console.error('Error sending email:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Log the failed email attempt
    await query(
      `INSERT INTO email_logs (user_id, recipient, subject, status, error, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId, Array.isArray(options.to) ? options.to.join(',') : options.to, options.subject, 'failed', errorMessage]
    );
    
    throw new Error(errorMessage);
  }
}

/**
 * Get emails from Microsoft account (Outlook)
 * @param userId The user ID in the database
 * @param folder The folder to fetch emails from (default: 'inbox')
 * @param limit Maximum number of emails to fetch (default: 20)
 */
export async function getEmails(userId: number, folder = 'inbox', limit = 20) {
  try {
    // Get user's access token from the database
    const userResult = await query(
      'SELECT access_token, token_expires_at FROM users WHERE id = $1 AND provider = $2',
      [userId, 'microsoft']
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found or not authenticated with Microsoft');
    }
    
    const user = userResult.rows[0];
    
    // Check if token is expired
    const tokenExpiry = new Date(user.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      throw new Error('Microsoft access token has expired. Please re-authenticate.');
    }
    
    // Use Microsoft Graph API to get emails
    const response = await axios.get(`https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages`, {
      headers: {
        Authorization: `Bearer ${user.access_token}`,
      },
      params: {
        $top: limit,
        $orderby: 'receivedDateTime DESC',
        $select: 'id,subject,sender,receivedDateTime,bodyPreview,hasAttachments',
      },
    });
    
    return response.data.value;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

/**
 * Create a draft email (save without sending)
 * @param userId The user ID in the database
 * @param options Email options
 */
export async function createDraft(userId: number, options: EmailOptions) {
  try {
    // Get user's access token from the database
    const userResult = await query(
      'SELECT access_token, token_expires_at FROM users WHERE id = $1 AND provider = $2',
      [userId, 'microsoft']
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found or not authenticated with Microsoft');
    }
    
    const user = userResult.rows[0];
    
    // Check if token is expired
    const tokenExpiry = new Date(user.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      throw new Error('Microsoft access token has expired. Please re-authenticate.');
    }
    
    // Create draft email using Microsoft Graph API
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/messages',
      {
        subject: options.subject,
        body: {
          contentType: options.html ? 'html' : 'text',
          content: options.html || options.text,
        },
        toRecipients: Array.isArray(options.to)
          ? options.to.map(email => ({ emailAddress: { address: email } }))
          : [{ emailAddress: { address: options.to } }],
      },
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating draft email:', error);
    throw error;
  }
}

export default {
  sendMicrosoftEmail,
  getEmails,
  createDraft,
};
