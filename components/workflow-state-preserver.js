/**
 * Workflow State Preserver
 * 
 * This script runs in the browser to capture and preserve workflow state
 * before Google authentication redirects, ensuring components aren't lost
 */

// Run immediately when the page loads
(function() {
  // Listen for any auth redirect events
  document.addEventListener('click', function(e) {
    // Check if the click is on an authentication button or link
    if (e.target && (
      e.target.closest('button[data-auth="true"]') ||
      e.target.closest('a[href*="auth/google"]')
    )) {
      captureWorkflowStateEmergency();
    }
  }, true);

  // Special handler for all Google auth buttons
  const authButtons = document.querySelectorAll('.auth-button, [data-service="google"], [data-service="gmail"], [data-service="calendar"], [data-service="drive"]');
  authButtons.forEach(button => {
    button.addEventListener('click', captureWorkflowStateEmergency, true);
  });

  // Capture from any tool interface component
  const toolComponents = document.querySelectorAll('[data-component-type="tools"]');
  toolComponents.forEach(component => {
    component.addEventListener('click', function(e) {
      if (e.target && e.target.closest('button')) {
        // Store reference to this component ID
        const componentId = component.getAttribute('data-component-id');
        if (componentId) {
          localStorage.setItem('last_clicked_component', componentId);
        }
      }
    }, true);
  });

  // Function to capture the entire workflow state
  function captureWorkflowStateEmergency() {
    try {
      // Get workflow ID
      const url = new URL(window.location.href);
      const workflowId = url.searchParams.get('id');
      
      if (!workflowId) return;
      
      console.log('EMERGENCY: Capturing workflow state before Google authentication');
      
      // 1. Get all components from the DOM
      const components = Array.from(document.querySelectorAll('[data-component-id]'))
        .map(el => el.getAttribute('data-component-id'))
        .filter(Boolean);
      
      // 2. Get all conversation starters
      const conversationInputs = document.querySelectorAll('input[placeholder="Enter conversation starter"]');
      const conversationTexts = Array.from(conversationInputs)
        .map(input => input.value)
        .filter(Boolean);
      
      // 3. Create complete backup
      const fullState = {
        workflowId,
        components,
        conversationTexts,
        timestamp: new Date().toISOString()
      };
      
      // 4. Save in multiple formats to ensure maximum compatibility
      localStorage.setItem(`workflow_backup_${workflowId}`, JSON.stringify(fullState));
      localStorage.setItem(`components_backup_${workflowId}`, JSON.stringify(components));
      localStorage.setItem(`conversation_starters_${workflowId}`, JSON.stringify(conversationTexts));
      localStorage.setItem('auth_in_progress', 'true');
      localStorage.setItem('last_workflow_id', workflowId);
      
      // 5. Save the current URL to return to
      localStorage.setItem('return_url', window.location.href);
      
      console.log('Saved emergency backup with', components.length, 'components and',
                  conversationTexts.length, 'conversation starters');
    } catch (err) {
      console.error('Error in emergency state capture:', err);
    }
  }
  
  // Check if we need to restore state on page load
  function checkForStateRestoration() {
    try {
      const authParam = new URLSearchParams(window.location.search).get('auth');
      const workflowId = new URLSearchParams(window.location.search).get('id');
      
      // If we're returning from auth with a workflow ID
      if (authParam === 'success' && workflowId) {
        console.log('Detected return from authentication, will restore state if needed');
        
        // Flag this page as needing restoration (will be picked up by workflow page)
        localStorage.setItem('needs_state_restoration', 'true');
        localStorage.setItem('restoration_workflow_id', workflowId);
        localStorage.setItem('auth_success_time', new Date().toISOString());
      }
    } catch (err) {
      console.error('Error checking for state restoration:', err);
    }
  }
  
  // Run state restoration check immediately 
  checkForStateRestoration();
})();
