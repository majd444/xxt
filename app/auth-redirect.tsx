"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * This component provides a special interceptor for authentication redirects
 * It ensures users are sent back to the right page after Google authentication
 */
export function AuthRedirectInterceptor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if this is an authentication redirect
    const auth = searchParams.get('auth');
    const service = searchParams.get('service');
    const componentId = searchParams.get('componentId');
    
    if (auth === 'success' && service && componentId && 
        componentId.startsWith('tools-') && window.location.pathname === '/new-agent') {
      
      // This appears to be a tools authentication that landed on /new-agent
      // We should check if we need to redirect to /workflow/new instead
      
      // Get the value we saved before authentication
      const savedUrl = localStorage.getItem('auth_return_url');
      
      if (savedUrl && savedUrl.includes('/workflow/')) {
        console.log('Intercepting auth redirect to new-agent, sending to workflow instead');
        
        // Extract workflow ID if present
        let workflowId = null;
        try {
          const urlObj = new URL(savedUrl);
          workflowId = urlObj.searchParams.get('id');
        } catch (err) {
          console.error('Error parsing saved URL:', err);
        }
        
        // Build redirect URL
        let redirectUrl = '/workflow/new';
        if (workflowId) {
          redirectUrl += `?id=${workflowId}&auth=success&service=${service}&componentId=${componentId}`;
        } else {
          redirectUrl += `?auth=success&service=${service}&componentId=${componentId}`;
        }
        
        // Redirect to workflow page
        console.log('Redirecting to:', redirectUrl);
        router.replace(redirectUrl);
      }
    }
  }, [router, searchParams]);
  
  // This component doesn't render anything
  return null;
}
