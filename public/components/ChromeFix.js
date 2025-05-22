/**
 * Chrome Authentication Fix
 * 
 * This script prevents component deletion during Google authentication in Chrome.
 * When a user clicks any auth button, this script will:
 * 1. Capture all components and state
 * 2. Save them to localStorage in multiple formats for redundancy
 * 3. Ensure they're properly restored after returning from OAuth
 */

(function() {
  // Run when DOM is ready
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('ChromeFix: Installing component preservation handlers');
      captureGoogleAuthClicks();
      checkForReturnFromAuth();
    });
  }

  // Capture clicks on any Google auth buttons
  function captureGoogleAuthClicks() {
    // Use event delegation for better performance
    document.addEventListener('click', function(e) {
      // Look for any Google auth related elements
      if (e.target && (
        e.target.closest('[data-service="google"]') || 
        e.target.closest('[data-service="gmail"]') ||
        e.target.closest('[data-service="drive"]') ||
        e.target.closest('[data-service="calendar"]') ||
        e.target.closest('[data-auth="true"]') ||
        e.target.closest('.auth-button')
      )) {
        console.log('ChromeFix: Detected Google auth click, saving workflow state');
        saveWorkflowState();
      }
    }, true);
  }

  // Save all workflow components and state
  function saveWorkflowState() {
    try {
      // Get workflow ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const workflowId = urlParams.get('id');
      
      if (!workflowId) return console.log('ChromeFix: No workflow ID found in URL');
      
      // 1. Get components from DOM
      const componentElements = document.querySelectorAll('[data-component-id]');
      if (!componentElements || componentElements.length === 0) {
        return console.log('ChromeFix: No components found in DOM');
      }
      
      const componentIds = Array.from(componentElements)
        .map(el => el.getAttribute('data-component-id'))
        .filter(id => id !== null);
      
      console.log('ChromeFix: Found', componentIds.length, 'components to preserve');
      
      // 2. Get conversation text inputs
      const conversationInputs = document.querySelectorAll('input[placeholder="Enter conversation starter"]');
      const conversationTexts = Array.from(conversationInputs)
        .map(input => input.value)
        .filter(Boolean);
      
      console.log('ChromeFix: Found', conversationTexts.length, 'conversation starters');
      
      // 3. Save everything in multiple formats for redundancy
      const timestamp = new Date().toISOString();
      
      // Format 1: Complete state object
      const completeState = {
        workflowId,
        componentIds,
        conversationTexts,
        timestamp,
        returnUrl: window.location.href
      };
      
      // Save to localStorage in multiple keys for redundancy
      localStorage.setItem(`chrome_fix_state_${workflowId}`, JSON.stringify(completeState));
      localStorage.setItem(`components_backup_${workflowId}`, JSON.stringify(componentIds));
      localStorage.setItem(`conversation_texts_${workflowId}`, JSON.stringify(conversationTexts));
      localStorage.setItem('auth_in_progress', 'true');
      localStorage.setItem('auth_timestamp', timestamp);
      localStorage.setItem('last_workflow_id', workflowId);
      localStorage.setItem('return_url', window.location.href);
      
      console.log('ChromeFix: Successfully saved workflow state before Google authentication');
    } catch (err) {
      console.error('ChromeFix: Error saving state:', err);
    }
  }
  
  // Check if we're returning from auth and need to restore state
  function checkForReturnFromAuth() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const workflowId = urlParams.get('id');
      
      // If we're returning from auth
      if (authStatus === 'success' && workflowId) {
        console.log('ChromeFix: Detected return from authentication, will restore if needed');
        
        // Set a flag to restore later (when components are accessible)
        localStorage.setItem('needs_restore', 'true');
        localStorage.setItem('restore_workflow_id', workflowId);
        localStorage.setItem('restore_time', new Date().toISOString());
        
        // Try to restore immediately (might not work if components aren't mounted yet)
        setTimeout(attemptRestore, 1000);
        // Also try again after a delay to be sure
        setTimeout(attemptRestore, 3000);
      }
    } catch (err) {
      console.error('ChromeFix: Error checking for auth return:', err);
    }
  }
  
  // Attempt to restore components if they're missing
  function attemptRestore() {
    const needsRestore = localStorage.getItem('needs_restore');
    const workflowId = localStorage.getItem('restore_workflow_id');
    
    if (needsRestore !== 'true' || !workflowId) return;
    
    console.log('ChromeFix: Attempting component restoration');
    
    // 1. Check if components are already present
    const currentComponents = document.querySelectorAll('[data-component-id]');
    if (currentComponents && currentComponents.length > 0) {
      console.log('ChromeFix: Components already present, no restoration needed:', currentComponents.length);
      localStorage.removeItem('needs_restore');
      return;
    }
    
    // 2. Get saved components from localStorage
    const savedStateJson = localStorage.getItem(`chrome_fix_state_${workflowId}`);
    if (!savedStateJson) {
      console.log('ChromeFix: No saved state found for workflow:', workflowId);
      return;
    }
    
    try {
      const savedState = JSON.parse(savedStateJson);
      console.log('ChromeFix: Found saved state with', 
                 savedState.componentIds?.length || 0, 'components and',
                 savedState.conversationTexts?.length || 0, 'conversation starters');
      
      // 3. Trigger component restoration in the main app
      if (savedState.componentIds && savedState.componentIds.length > 0) {
        window.__TRIGGER_COMPONENT_RESTORE = savedState;
        localStorage.setItem('__COMPONENT_RESTORE_TRIGGER', JSON.stringify(savedState));
        console.log('ChromeFix: Set trigger for component restoration');
        
        // Create a custom event to notify the app
        const restoreEvent = new CustomEvent('workflow-state-restore', { 
          detail: savedState 
        });
        document.dispatchEvent(restoreEvent);
      }
    } catch (err) {
      console.error('ChromeFix: Error restoring components:', err);
    }
  }
})();
