/**
 * URL Security Utilities
 * 
 * This module provides utilities for securely handling URLs and preventing open redirect vulnerabilities.
 * It ensures all redirects stay within the application's domain or are explicitly allowed.
 */

/**
 * Verifies if a URL is safe for redirecting by checking if it's:
 * 1. A relative URL (starts with /)
 * 2. Belongs to the same origin as the current window
 * 3. Is in the allowlist of trusted external domains
 * 
 * @param url - The URL to validate
 * @param allowedExternalDomains - Optional array of trusted external domains
 * @returns boolean - True if the URL is safe for redirecting
 */
export function isSafeRedirectUrl(url: string, allowedExternalDomains: string[] = []): boolean {
  // Allow relative URLs
  if (url.startsWith('/')) {
    return true;
  }

  try {
    // Check if URL is valid and belongs to our domain
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    
    // Same origin is always safe
    if (typeof window !== 'undefined' && urlObj.origin === window.location.origin) {
      return true;
    }
    
    // Check if the URL's domain is in our allowlist
    return allowedExternalDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch (e) {
    // Invalid URL - not safe
    console.error('Invalid URL in redirect check:', url, e instanceof Error ? e.message : 'Unknown error');
    return false;
  }
}

/**
 * Returns a safe URL for redirecting - either the original URL if safe,
 * or a fallback URL if the original is not safe.
 * 
 * @param url - The URL to validate and use for redirecting
 * @param fallbackUrl - The fallback URL to use if the original is unsafe (defaults to '/')
 * @param allowedExternalDomains - Optional array of trusted external domains
 * @returns string - A safe URL for redirecting
 */
export function getSafeRedirectUrl(
  url: string, 
  fallbackUrl: string = '/',
  allowedExternalDomains: string[] = []
): string {
  if (isSafeRedirectUrl(url, allowedExternalDomains)) {
    return url;
  }
  
  console.warn(`Blocked potential open redirect to: ${url}. Redirecting to ${fallbackUrl} instead.`);
  return fallbackUrl;
}

/**
 * Safely navigates to a URL after validating it for security
 * Prevents open redirect vulnerabilities
 * 
 * @param url - The URL to navigate to
 * @param fallbackUrl - The fallback URL to use if the original is unsafe (defaults to '/')
 * @param allowedExternalDomains - Optional array of trusted external domains
 */
export function safeRedirect(
  url: string, 
  fallbackUrl: string = '/',
  allowedExternalDomains: string[] = []
): void {
  if (typeof window === 'undefined') return;
  
  const safeUrl = getSafeRedirectUrl(url, fallbackUrl, allowedExternalDomains);
  window.location.href = safeUrl;
}
