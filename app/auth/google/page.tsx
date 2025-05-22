"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get service and componentId from URL parameters
    const service = searchParams.get('service');
    const componentId = searchParams.get('componentId');
    
    // Get the current workflow URL including all query parameters
    // First try to get from the document.referrer, which has the full URL the user came from
    let returnUrl = '';
    
    // If we're coming from a workflow page, use that as the return URL
    if (document.referrer && document.referrer.includes('/workflow/')) {
      returnUrl = document.referrer;
    } else {
      // Otherwise, check if there's a returnPath parameter
      const returnPath = searchParams.get('returnPath');
      if (returnPath) {
        returnUrl = returnPath.startsWith('http') ? returnPath : `${window.location.origin}${returnPath}`;
      } else {
        // Default to the workflow/new page
        returnUrl = `${window.location.origin}/workflow/new`;
      }
    }
    
    // Save the complete return URL to localStorage so we can redirect back after auth
    localStorage.setItem('auth_return_url', returnUrl);
    
    if (!service || !componentId) {
      console.error("Missing required parameters");
      // Get the saved return URL or default to workflow page (NOT create-agent)
      // This fixes the Safari issue where it redirects to new-agent instead of workflow
      const returnUrl = localStorage.getItem('auth_return_url') || '/workflow/new';
      
      // Create a URL object to properly append parameters
      const url = new URL(returnUrl, window.location.origin);
      url.searchParams.append('auth', 'error');
      url.searchParams.append('reason', 'missing_params');
      
      router.push(url.toString());
      return;
    }
    
    // Create a random state parameter for security
    const state = btoa(JSON.stringify({ service, componentId, timestamp: Date.now() }));
    
    // Store state in localStorage for verification
    localStorage.setItem('oauth_state', state);
    
    // Build Google OAuth URL directly
    const scopes = getScopes(service);
    // Use the current window origin for the redirect
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', '925544733840-s0t1dqoium2g3u7flr2ua4as73o4ncsu.apps.googleusercontent.com');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('include_granted_scopes', 'true');
    authUrl.searchParams.append('prompt', 'select_account');
    authUrl.searchParams.append('state', state);
    
    console.log("Direct auth redirecting to:", authUrl.toString());
    
    // Redirect directly to Google
    window.location.href = authUrl.toString();
  }, [router, searchParams]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Redirecting to Google...
          </h1>
          
          <div className="mt-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
            
            <p className="text-gray-600 mt-4">
              You'll be redirected to Google to authorize access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get scopes for different services
function getScopes(service: string): string[] {
  switch (service) {
    case 'gmail':
      return [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.labels'
      ];
    case 'calendar':
      return [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];
    case 'drive':
      return [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
      ];
    default:
      return ['https://www.googleapis.com/auth/userinfo.email'];
  }
}
