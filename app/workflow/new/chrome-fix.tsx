"use client"

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * ChromeFix Component
 * 
 * This component fixes two issues in Chrome:
 * 1. Components being deleted during Google authentication
 * 2. Wrong messages in conversation starters after authentication
 */
export default function ChromeFix({
  components,
  setComponents,
  _conversationTexts,
  setConversationTexts
}: {
  components: any[]
  setComponents: (components: any[]) => void
  _conversationTexts: any
  setConversationTexts: (texts: any) => void
}) {
  const searchParams = useSearchParams()

  // Load both state preserver and ChromeFix scripts for maximum reliability
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Create and load the workflow state preserver script
    const workflowPreserver = document.createElement('script')
    workflowPreserver.src = '/workflow-state-preserver.js'
    workflowPreserver.async = true
    workflowPreserver.defer = true
    document.head.appendChild(workflowPreserver)
    
    // Create and load the ChromeFix script for redundancy
    const chromeFix = document.createElement('script')
    chromeFix.src = '/components/ChromeFix.js'
    chromeFix.async = true
    chromeFix.defer = true
    document.head.appendChild(chromeFix)

    // Setup event listener for workflow state restoration events
    const handleStateRestore = (event: CustomEvent) => {
      console.log('ChromeFix: Received workflow-state-restore event', event.detail);
      tryRestoreWorkflowState(event.detail);
    };
    
    document.addEventListener('workflow-state-restore', handleStateRestore as EventListener);

    // Clean up on unmount
    return () => {
      try {
        document.head.removeChild(workflowPreserver);
        document.head.removeChild(chromeFix);
        document.removeEventListener('workflow-state-restore', handleStateRestore as EventListener);
      } catch (err) {
        console.error('ChromeFix cleanup error:', err);
      }
    }
  }, [])

  // Function to restore workflow state from backup
  const tryRestoreWorkflowState = (savedState: any) => {
    if (!savedState) return;
    
    // Don't restore if we already have components
    if (components.length > 0) {
      console.log('ChromeFix: Components already present, skipping restoration');
      return;
    }
    
    console.log('ChromeFix: Attempting to restore from savedState', savedState);
    
    // Restore components if available
    if (savedState.componentIds && savedState.componentIds.length > 0) {
      console.log('ChromeFix: Restoring', savedState.componentIds.length, 'components');
      setComponents(savedState.componentIds);
    }
    
    // Restore conversation texts if available
    if (savedState.conversationTexts && savedState.conversationTexts.length > 0) {
      console.log('ChromeFix: Restoring', savedState.conversationTexts.length, 'conversation starters');
      
      // Convert array to object format expected by the state
      const conversationsObj: Record<string, string> = {};
      savedState.conversationTexts.forEach((text: string, index: number) => {
        conversationsObj[`text-${index+1}`] = text;
      });
      
      setConversationTexts(conversationsObj);
    }
  };

  // Restore state after authentication
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if we're returning from authentication
    const authFromParam = searchParams.get('auth');
    const workflowId = searchParams.get('id');
    
    // Check for various state backup methods
    if (authFromParam === 'success' && components.length === 0 && workflowId) {
      console.log('ChromeFix: Detected possible component loss after auth redirect');
      
      // Try all possible restoration paths
      
      // Method 1: Check new ChromeFix.js trigger
      const restoreTrigger = localStorage.getItem('__COMPONENT_RESTORE_TRIGGER');
      if (restoreTrigger) {
        try {
          const triggerData = JSON.parse(restoreTrigger);
          console.log('ChromeFix: Found restore trigger with', 
                     triggerData.componentIds?.length || 0, 'components');
          tryRestoreWorkflowState(triggerData);
          localStorage.removeItem('__COMPONENT_RESTORE_TRIGGER');
          localStorage.removeItem('needs_restore');
          return;
        } catch (e) {
          console.error('ChromeFix: Error parsing restore trigger:', e);
        }
      }
      
      // Method 2: Check chrome_fix_state
      const chromeFixState = localStorage.getItem(`chrome_fix_state_${workflowId}`);
      if (chromeFixState) {
        try {
          const stateData = JSON.parse(chromeFixState);
          console.log('ChromeFix: Found chrome_fix_state with', 
                     stateData.componentIds?.length || 0, 'components');
          tryRestoreWorkflowState(stateData);
          return;
        } catch (e) {
          console.error('ChromeFix: Error parsing chrome_fix_state:', e);
        }
      }
      
      // Method 3: Check legacy components_backup
      const componentsBackup = localStorage.getItem(`components_backup_${workflowId}`);
      const conversationsBackup = localStorage.getItem(`conversation_texts_${workflowId}`);
      
      if (componentsBackup || conversationsBackup) {
        try {
          const legacyState: any = { workflowId };
          
          if (componentsBackup) {
            legacyState.componentIds = JSON.parse(componentsBackup);
          }
          
          if (conversationsBackup) {
            legacyState.conversationTexts = JSON.parse(conversationsBackup);
          }
          
          console.log('ChromeFix: Found legacy backup with', 
                    legacyState.componentIds?.length || 0, 'components');
          tryRestoreWorkflowState(legacyState);
        } catch (e) {
          console.error('ChromeFix: Error restoring from legacy backup:', e);
        }
      }
      
      // Clear all restoration flags
      localStorage.removeItem('needs_restore');
      localStorage.removeItem('auth_in_progress');
    }
  }, [searchParams, components.length, setComponents, setConversationTexts])
  
  return null
}
