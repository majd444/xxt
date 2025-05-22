"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleAuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authentication...");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get parameters from the URL
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        
        if (error) {
          setStatus("error");
          setMessage(`Google authentication error: ${error}`);
          return;
        }
        
        if (!code || !state) {
          setStatus("error");
          setMessage("Missing required parameters");
          return;
        }

        // Decode state to get the component ID and service
        let decodedState;
        try {
          decodedState = JSON.parse(atob(state));
        } catch (error) {
          console.error('Failed to parse state parameter:', error);
          setStatus("error");
          setMessage("Invalid state parameter");
          return;
        }
        
        const { componentId, service } = decodedState;
        
        // Post information directly to our server
        const response = await fetch('/api/auth/google/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code,
            state,
            // These values help debug the redirect URI issues
            redirectUri: window.location.origin + '/auth/google/callback',
            currentUrl: window.location.href
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Authentication failed: ${errorText}`);
        }
        
        // Store local token flag for immediate UI feedback
        localStorage.setItem(`google_${service}_connected`, 'true');
        
        setStatus("success");
        setMessage(`Successfully connected ${service.toUpperCase()}`);
        
        // Get the previous page from localStorage or default to the create-agent page
        const returnPath = localStorage.getItem('auth_return_path') || '/create-agent';
        
        // Redirect back to the original page with success params
        setTimeout(() => {
          router.push(`${returnPath}?auth=success&service=${service}&componentId=${componentId}`);
        }, 2000);
      } catch (error) {
        console.error("Error in OAuth callback:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "An unknown error occurred");
        
        // Get the previous page from localStorage or default to the create-agent page
        const returnPath = localStorage.getItem('auth_return_path') || '/create-agent';
        
        // Redirect back to the original page with error
        setTimeout(() => {
          router.push(`${returnPath}?auth=error`);
        }, 3000);
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {status === "loading" && "Processing Authentication"}
            {status === "success" && "Authentication Successful"}
            {status === "error" && "Authentication Failed"}
          </h1>
          
          <div className="mt-4">
            {status === "loading" && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {status === "success" && (
              <div className="text-green-500 text-6xl flex justify-center mb-4">✓</div>
            )}
            
            {status === "error" && (
              <div className="text-red-500 text-6xl flex justify-center mb-4">✗</div>
            )}
            
            <p className="text-gray-600 mt-4">{message}</p>
            
            {status !== "loading" && (
              <p className="text-sm text-gray-500 mt-4">
                You will be redirected back to the workflow editor in a few seconds...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
