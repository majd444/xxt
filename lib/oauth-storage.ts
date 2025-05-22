import { query } from '@/lib/db';

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// Function to store OAuth tokens in the database
export async function storeOAuthToken(
  userId: string,
  provider: string,
  service: string,
  tokenData: TokenData
) {
  try {
    console.log('Storing OAuth token in database for:', { provider, service });
    
    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Check if a token entry already exists for this user, provider, and service
    const existingResult = await query(
      `SELECT * FROM oauth_tokens 
       WHERE user_id = $1 AND provider = $2 AND service = $3`,
      [userId, provider, service]
    );

    if (existingResult.rowCount > 0) {
      // Update existing token
      await query(
        `UPDATE oauth_tokens 
         SET access_token = $1, 
             refresh_token = $2, 
             expires_at = $3, 
             scope = $4, 
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5 AND provider = $6 AND service = $7`,
        [
          tokenData.access_token,
          tokenData.refresh_token || null,
          expiresAt,
          tokenData.scope,
          userId,
          provider,
          service
        ]
      );
      console.log('Updated existing OAuth token in database');
    } else {
      // Create new token entry
      await query(
        `INSERT INTO oauth_tokens 
         (user_id, provider, service, access_token, refresh_token, expires_at, scope, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          provider,
          service,
          tokenData.access_token,
          tokenData.refresh_token || null,
          expiresAt,
          tokenData.scope
        ]
      );
      console.log('Inserted new OAuth token in database');
    }

    return true;
  } catch (error) {
    console.error('Error storing OAuth token in database:', error);
    throw error;
  }
}

// Function to retrieve OAuth tokens from the database
export async function getOAuthToken(userId: string, provider: string, service: string) {
  try {
    const result = await query(
      `SELECT * FROM oauth_tokens 
       WHERE user_id = $1 AND provider = $2 AND service = $3`,
      [userId, provider, service]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const token = result.rows[0];
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const isExpired = now > expiresAt;

    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      is_expired: isExpired,
      scope: token.scope
    };
  } catch (error) {
    console.error('Error retrieving OAuth token from database:', error);
    return null;
  }
}
