"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function WorkflowAuthInterceptor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Handle redirect after Google authentication
    const authStatus = searchParams.get('auth')
    const service = searchParams.get('service')
    const componentId = searchParams.get('componentId')
    const workflowId = searchParams.get('id')
    
    if (authStatus === 'success' && service && workflowId) {
      console.log('Authentication successful for workflow:', workflowId, 'service:', service)
      
      // Set successful authentication flag for this service/component
      if (componentId) {
        localStorage.setItem(`auth_status_${service}_${componentId}`, 'success')
      }
      
      // Critical: Set special flag to ensure we preserve the workflow
      localStorage.setItem('preserve_workflow_after_auth', 'true')
      localStorage.setItem('preserved_workflow_id', workflowId)
      
      // Force a component display using the ID from the URL
      if (workflowId && componentId) {
        // Try to get any directly preserved components
        const directComponentsJson = localStorage.getItem(`direct_components_${workflowId}`)
        const idText = localStorage.getItem(`component_ids_plain_${workflowId}`)
        
        if (directComponentsJson || idText) {
          console.log('Found preserved component data for workflow:', workflowId)
          localStorage.setItem(`force_restore_${workflowId}`, 'true')
        }
      }
    }
  }, [router, searchParams])
  
  return null
}
