"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Simplified component to handle the OAuth callback directly
export default function AuthCallback() {
  const [message, setMessage] = useState("Processing authentication...");
  const router = useRouter();
  
  useEffect(() => {
    // Function to get URL parameter
    function getUrlParameter(name: string) {
      name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
      const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      const results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    const handleCallback = async () => {
      try {
        // Get the code and state from URL
        const code = getUrlParameter('code');
        const state = getUrlParameter('state');
        
        if (!code || !state) {
          setMessage("Error: Missing authentication parameters");
          return;
        }
        
        setMessage("Authentication successful, setting up your account...");
        
        // Decode state parameter to get service and componentId
        const decodedState = JSON.parse(atob(state));
        const { service, componentId } = decodedState;
        
        // Store a simple flag in localStorage to indicate successful auth
        // This is just temporary - in a real app, you'd validate this on the server
        localStorage.setItem(`google_auth_${service}_${componentId}`, 'true');
        
        // Redirect back to workflow page while preserving existing query parameters
        setTimeout(() => {
          // Get the return URL from localStorage (set before redirecting to auth)
          let returnUrl = localStorage.getItem('auth_return_url') || '/workflow/new';
          console.log('Return URL from localStorage:', returnUrl);
          
          // Extract the workflow ID from the return URL
          let workflowId = null;
          try {
            const urlObj = new URL(returnUrl, window.location.origin);
            workflowId = urlObj.searchParams.get('id');
            console.log('Extracted workflow ID:', workflowId);
          } catch (err) {
            console.error('Error parsing return URL:', err);
          }
          
          // Construct a clean redirect URL with the workflow ID
          let redirectUrl;
          if (workflowId) {
            // If we have a workflow ID, use it in the redirect
            redirectUrl = `/workflow/new?id=${workflowId}&auth=success&service=${service}&componentId=${componentId}`;
          } else {
            // Fall back to the basic URL if we can't extract the ID
            redirectUrl = `/workflow/new?auth=success&service=${service}&componentId=${componentId}`;
          }
          
          console.log('Redirecting to:', redirectUrl);
          
          // Fix for Safari - use both approaches for cross-browser compatibility
          // First save critical state to localStorage for Safari
          localStorage.setItem('lastRedirectUrl', redirectUrl);
          localStorage.setItem('safariWorkflowRedirect', 'true');
          
          // Use the router for Next.js managed navigation (works better in Safari)
          try {
            // Use router.push first (better for Safari)
            router.push(redirectUrl);
          } catch (err) {
            console.error('Router navigation failed, falling back to window.location:', err);
            // Fallback to direct navigation
            window.location.href = redirectUrl;
          }
        }, 1000);
      } catch (error) {
        console.error("Authentication error:", error);
        setMessage("Authentication failed. Please try again.");
        
        // Redirect back to workflow page with error while preserving existing query parameters
        setTimeout(() => {
          // Get the return URL from localStorage (set before redirecting to auth)
          let returnUrl = localStorage.getItem('auth_return_url') || '/workflow/new';
          console.log('Return URL from localStorage (error case):', returnUrl);
          
          // Extract the workflow ID from the return URL
          let workflowId = null;
          try {
            const urlObj = new URL(returnUrl, window.location.origin);
            workflowId = urlObj.searchParams.get('id');
            console.log('Extracted workflow ID (error case):', workflowId);
          } catch (err) {
            console.error('Error parsing return URL (error case):', err);
          }
          
          // Construct a clean redirect URL with the workflow ID
          let redirectUrl;
          if (workflowId) {
            // If we have a workflow ID, use it in the redirect
            redirectUrl = `/workflow/new?id=${workflowId}&auth=error`;
          } else {
            // Fall back to the basic URL if we can't extract the ID
            redirectUrl = `/workflow/new?auth=error`;
          }
          
          console.log('Redirecting to (error case):', redirectUrl);
          
          // Fix for Safari - use both approaches for cross-browser compatibility
          // First save critical state to localStorage for Safari
          localStorage.setItem('lastRedirectUrl', redirectUrl);
          localStorage.setItem('safariWorkflowRedirect', 'true');
          localStorage.setItem('authErrorOccurred', 'true');
          
          // Use the router for Next.js managed navigation (works better in Safari)
          try {
            // Use router.push first (better for Safari)
            router.push(redirectUrl);
          } catch (err) {
            console.error('Router navigation failed, falling back to window.location:', err);
            // Fallback to direct navigation
            window.location.href = redirectUrl;
          }
        }, 2000);
      }
    };
    
    handleCallback();
  }, [router]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-900">Google Authentication</h1>
        
        <div className="flex justify-center my-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
        
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
