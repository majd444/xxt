import axios from 'axios';
import { query } from '../db';

// SMS configuration types
interface SmsOptions {
  to: string;
  message: string;
  from?: string;
}

/**
 * Send an SMS message using an external SMS provider
 * This implementation uses a generic approach that can be adapted to various SMS providers
 * @param options SMS message options
 */
export async function sendSms(options: SmsOptions) {
  try {
    // You can replace this with your preferred SMS provider (Twilio, Nexmo, etc.)
    // This is a placeholder for the API request to the SMS provider
    
    // Example with a generic SMS service
    const response = await axios.post(
      'https://api.yoursmsservice.com/v1/messages',
      {
        to: options.to,
        message: options.message,
        from: options.from || process.env.SMS_DEFAULT_SENDER,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Log the SMS in the database
    await query(
      `INSERT INTO sms_logs (recipient, message, status, provider_message_id, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [options.to, options.message, 'sent', response.data.id]
    );
    
    return {
      success: true,
      messageId: response.data.id,
    };
  } catch (error: unknown) {
    console.error('Error sending SMS:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Log the failed SMS attempt
    await query(
      `INSERT INTO sms_logs (recipient, message, status, error, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [options.to, options.message, 'failed', errorMessage]
    );
    
    throw new Error(errorMessage);
  }
}

/**
 * Schedule an SMS to be sent at a later time
 * @param options SMS message options
 * @param scheduledTime ISO string of when the SMS should be sent
 */
export async function scheduleSms(options: SmsOptions, scheduledTime: string) {
  try {
    // Store the scheduled SMS in the database
    const result = await query(
      `INSERT INTO scheduled_sms (recipient, message, sender, scheduled_time, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id`,
      [options.to, options.message, options.from || process.env.SMS_DEFAULT_SENDER, scheduledTime]
    );
    
    return {
      success: true,
      scheduledSmsId: result.rows[0].id,
      scheduledTime,
    };
  } catch (error) {
    console.error('Error scheduling SMS:', error);
    throw error;
  }
}

/**
 * Get the status of a sent SMS
 * @param messageId The message ID returned from the SMS provider
 */
export async function getSmsStatus(messageId: string) {
  try {
    // Example with a generic SMS service
    const response = await axios.get(
      `https://api.yoursmsservice.com/v1/messages/${messageId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
        },
      }
    );
    
    // Update the status in the database
    await query(
      `UPDATE sms_logs 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE provider_message_id = $2`,
      [response.data.status, messageId]
    );
    
    return {
      messageId,
      status: response.data.status,
      deliveredAt: response.data.delivered_at,
    };
  } catch (error) {
    console.error('Error getting SMS status:', error);
    throw error;
  }
}

export default {
  sendSms,
  scheduleSms,
  getSmsStatus,
};
