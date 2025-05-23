import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';

/**
 * SECURITY CONFIGURATION: JWT Implementation
 * 
 * This module handles JWT authentication with security best practices:
 * 1. No hardcoded secrets - all sensitive values from environment variables
 * 2. Environment-specific behavior (stricter in production)
 * 3. Secure random secrets in development (still requires manual setting in production)
 * 4. Proper secret rotation support through lazy loading
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 * - JWT_SECRET: Must be set in production, should be at least 32 bytes (64 hex chars)
 */

// Private module state - not exposed directly
let _jwtSecretCache: string | null = null;

/**
 * Securely provides the JWT secret for token operations with defense-in-depth
 * @private - Module internal use only
 * @returns The JWT secret to use for token operations
 * @throws Error in production when JWT_SECRET is missing
 */
function _securelyGetJwtSecret(): string {
  // Use cached value if already generated/retrieved
  if (_jwtSecretCache) return _jwtSecretCache;

  // First try to get the JWT secret from environment variables (preferred)
  const envSecret = process.env.JWT_SECRET;
  
  if (envSecret) {
    // Use environment variable (recommended approach)
    _jwtSecretCache = envSecret;
    return _jwtSecretCache;
  }
  
  // No environment secret - handle based on environment
  if (process.env.NODE_ENV === 'production') {
    // CRITICAL SECURITY MEASURE: Fail immediately in production
    // Better to crash than operate insecurely in production
    throw new Error(
      'SECURITY VIOLATION: JWT_SECRET environment variable is required in production!\n' +
      'Please set a strong, unique JWT_SECRET (min 32 bytes/64 hex chars) in your environment.'
    );
  } else {
    // Development-only fallback: Generate a secure random value
    console.warn(
      '⚠️ SECURITY WARNING: No JWT_SECRET environment variable found.\n' +
      'Generating a temporary random secret for DEVELOPMENT use only.\n' +
      'This secret will change each time the server restarts.\n' +
      'Set JWT_SECRET in your environment to persist tokens across restarts.'
    );
    
    // Generate a cryptographically secure random value (32 bytes = 256 bits)
    _jwtSecretCache = crypto.randomBytes(32).toString('hex');
    return _jwtSecretCache;
  }
}

// Types
export interface UserJwtPayload {
  id: string | number; // Allow both string and number IDs for flexibility
  email: string;
  name?: string;
}

// Middleware for API routes
export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, user: UserJwtPayload) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = extractTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = verifyToken(token);
      return await handler(req, res, user);
    } catch (error) {
      console.error("Authentication error:", error);
      return res.status(401).json({ error: "Invalid authentication" });
    }
  };
}

// Middleware for App Router
export async function authMiddleware(request: NextRequest) {
  try {
    const token = extractTokenFromNextRequest(request);
    
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const user = verifyToken(token);
    // You can pass the user info through headers or context
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id.toString());
    requestHeaders.set('x-user-email', user.email);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
  }
}

// Generate JWT token with secure, environment-appropriate secret
export function generateToken(payload: UserJwtPayload): string {
  return jwt.sign(payload, _securelyGetJwtSecret(), { expiresIn: "7d" });
}

// Verify JWT token with secure, environment-appropriate secret
export function verifyToken(token: string): UserJwtPayload {
  return jwt.verify(token, _securelyGetJwtSecret()) as UserJwtPayload;
}

// Extract token from request (API Routes)
function extractTokenFromRequest(req: NextApiRequest): string | null {
  // From Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  // From cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

// Extract token from Next.js App Router request
function extractTokenFromNextRequest(req: NextRequest): string | null {
  // From Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  // From cookies
  const token = req.cookies.get("token")?.value;
  if (token) {
    return token;
  }
  
  return null;
}
