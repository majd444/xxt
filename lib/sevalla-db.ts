/**
 * Sevalla Database Integration
 * 
 * This module handles connections and operations for Sevalla-hosted PostgreSQL database
 */

import { Pool } from 'pg';
import { createUserSchema, getUserSchemaName } from './user-schema';

// Create a database connection pool using environment variables
// These values come from your Sevalla database configuration
const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  // Disable SSL for Sevalla connection as it doesn't support it
  ssl: false,
});

// Execute a database query with optional parameters
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize the OAuth tokens table in the public schema (legacy, use createUserSchema instead)
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function initOAuthTable(): Promise<boolean> {
  try {
    // Create the oauth_tokens table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        service VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMP NOT NULL,
        scope TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider, service)
      )
    `);
    
    console.log('OAuth tokens table initialized successfully in public schema');
    return true;
  } catch (error) {
    console.error('Failed to initialize OAuth tokens table in public schema:', error);
    return false;
  }
}

// Store an OAuth token in the database
export async function storeOAuthToken(
  userId: string,
  provider: string,
  service: string,
  tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type?: string;
    scope?: string;
  }
): Promise<void> {
  try {
    // Ensure user schema exists before proceeding
    await createUserSchema(userId);
    
    const schemaName = getUserSchemaName(userId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);
    
    // Check if token already exists for this provider and service in user's schema
    const checkResult = await query(
      `SELECT id FROM ${schemaName}.oauth_tokens WHERE provider = $1 AND service = $2`,
      [provider, service]
    );
    
    if (checkResult && checkResult.rowCount && checkResult.rowCount > 0) {
      // Update existing token in user's schema
      await query(
        `UPDATE ${schemaName}.oauth_tokens 
         SET access_token = $1, 
             refresh_token = $2, 
             expires_at = $3, 
             scope = $4, 
             updated_at = CURRENT_TIMESTAMP
         WHERE provider = $5 AND service = $6`,
        [
          tokenData.access_token,
          tokenData.refresh_token || null,
          expiresAt,
          tokenData.scope || '',
          provider,
          service
        ]
      );
      console.log(`Updated existing OAuth token for ${provider}:${service} in user ${userId}'s schema`);
    } else {
      // Insert new token in user's schema
      await query(
        `INSERT INTO ${schemaName}.oauth_tokens 
         (provider, service, access_token, refresh_token, expires_at, scope, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          provider,
          service,
          tokenData.access_token,
          tokenData.refresh_token || null,
          expiresAt,
          tokenData.scope || ''
        ]
      );
      console.log(`Stored new OAuth token for ${provider}:${service} in user ${userId}'s schema`);
    }
  } catch (error) {
    console.error(`Error storing OAuth token in database for user ${userId}:`, error);
    throw error;
  }
}

// Retrieve an OAuth token from the database
export async function getOAuthToken(userId: string, provider: string, service: string) {
  try {
    // Get the user's schema name
    const schemaName = getUserSchemaName(userId);
    
    // First check if the schema exists
    const schemaCheck = await query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName]
    );
    
    // If schema doesn't exist yet, return null
    if (!schemaCheck || schemaCheck.rowCount === 0) {
      console.log(`Schema ${schemaName} doesn't exist yet for user ${userId}`);
      return null;
    }
    
    // Query the token from the user's schema
    const result = await query(
      `SELECT * FROM ${schemaName}.oauth_tokens WHERE provider = $1 AND service = $2`,
      [provider, service]
    );
    
    if (!result || result.rowCount === 0) {
      console.log(`No ${provider}:${service} token found for user ${userId}`);
      return null;
    }
    
    const token = result.rows[0];
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const isExpired = now > expiresAt;
    
    console.log(`Retrieved ${provider}:${service} token for user ${userId}`);
    
    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      is_expired: isExpired,
      scope: token.scope
    };
  } catch (error) {
    console.error(`Error retrieving OAuth token for user ${userId}:`, error);
    return null;
  }
}