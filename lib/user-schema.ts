import { query } from './sevalla-db';

/**
 * Creates a new schema for a user if it doesn't already exist
 * @param userId The unique identifier for the user
 * @returns Promise that resolves when schema is created
 */
export async function createUserSchema(userId: string): Promise<void> {
  try {
    // Sanitize the userId to ensure it's safe for SQL
    const safeUserId = sanitizeForSchemaName(userId);
    
    // Create a schema for the user if it doesn't exist
    await query(`CREATE SCHEMA IF NOT EXISTS user_${safeUserId}`);
    
    // Create the oauth_tokens table in the user's schema
    await query(`
      CREATE TABLE IF NOT EXISTS user_${safeUserId}.oauth_tokens (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        service VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMP NOT NULL,
        scope TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, service)
      )
    `);
    
    console.log(`✅ Schema for user ${userId} created or already exists`);
  } catch (error) {
    console.error(`❌ Error creating schema for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Sanitizes a user ID to be used as part of a schema name
 * @param userId The original user ID
 * @returns Sanitized user ID safe for schema names
 */
function sanitizeForSchemaName(userId: string): string {
  // Remove any characters that aren't alphanumeric or underscore
  // Then ensure it starts with a letter or underscore (PostgreSQL requirement)
  const sanitized = userId.replace(/[^a-zA-Z0-9_]/g, '_');
  return sanitized.match(/^[0-9]/) ? `_${sanitized}` : sanitized;
}

/**
 * Gets the schema name for a user
 * @param userId The unique identifier for the user
 * @returns The schema name
 */
export function getUserSchemaName(userId: string): string {
  const safeUserId = sanitizeForSchemaName(userId);
  return `user_${safeUserId}`;
}
