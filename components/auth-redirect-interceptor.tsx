"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeRedirect } from '../lib/utils/url-security'

export default function AuthRedirectInterceptor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Handle redirect after Google authentication
    const authStatus = searchParams.get('auth')
    const service = searchParams.get('service')
    const componentId = searchParams.get('componentId')
    
    if (authStatus === 'success' && service) {
      console.log('Authentication successful for service:', service)
      
      // First check if we have a saved return URL (most reliable)
      const savedReturnUrl = localStorage.getItem('auth_return_url')
      const workflowIdToRestore = localStorage.getItem('workflow_id_to_restore')
      
      if (savedReturnUrl) {
        console.log('Found saved return URL:', savedReturnUrl)
        localStorage.removeItem('auth_return_url')
        
        // CRITICAL FIX: Set special flag to ensure we know to restore workflow on return
        localStorage.setItem('just_authenticated', 'true')
        localStorage.setItem('auth_service', service)
        localStorage.setItem('auth_component_id', componentId || '')
        localStorage.setItem('auth_time', new Date().toISOString())
        localStorage.setItem('bypass_component_check', 'true')
        
        // Use the secure redirect utility to prevent open redirect vulnerabilities
        // This will validate the URL and only redirect to safe destinations
        safeRedirect(savedReturnUrl);
        return
      }
      
      // Fallback: Check if we have a direct workflow URL as backup
      const directWorkflowUrl = localStorage.getItem('direct_workflow_url')
      if (directWorkflowUrl && workflowIdToRestore) {
        console.log('Using direct workflow URL as fallback:', directWorkflowUrl)
        localStorage.removeItem('direct_workflow_url')
        
        // Set special flags
        localStorage.setItem('just_authenticated', 'true')
        localStorage.setItem('auth_service', service)
        localStorage.setItem('bypass_component_check', 'true')
        
        // Use the secure redirect utility to prevent open redirect vulnerabilities
        // This will validate the URL and only redirect to safe destinations
        safeRedirect(directWorkflowUrl);
        return
      }
      
      // Last resort fallback: Go to new agent page
      console.log('No saved return URL found, redirecting to default page')
      router.push('/new-agent')
    }
  }, [router, searchParams])
  
  return null
}
