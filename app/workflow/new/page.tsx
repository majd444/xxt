"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import type React from "react"
import ChromeFix from "./chrome-fix"
import { safeRedirect } from "../../../lib/utils/url-security"

// Create a safe localStorage wrapper that only runs on client side
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

// Declare window property for workflow state
declare global {
  interface Window {
    __WORKFLOW_STATE?: any;
  }
}

import {
  ArrowRight,
  MessageCircle,
  FileText,
  MessageSquare,
  Plus,
  Save,
  PenToolIcon as Tool,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChatInterface } from "@/components/chat-interface"
import { ToolsInterface } from "@/components/tools-interface"

type ComponentType = "conversation" | "tools" | "prompt"
type Position = { x: number; y: number }

type ConditionType = "if" | "else" | "and" | "or" | null

interface Connection {
  id: string
  from: string
  to: string
  condition: ConditionType
  value?: string
}

interface WorkflowComponent {
  id: string
  type: ComponentType
  position: Position
  title: string
  toolId?: string
}

// Debug panel has been removed as it's not used

export default function NewWorkflowPage() {
  const [components, setComponents] = useState<WorkflowComponent[]>([])
  const [activeComponent, setActiveComponent] = useState<string | null>(null)
  const [startPosition, setStartPosition] = useState<Position | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)
  const [draggingConnection, setDraggingConnection] = useState<{ from: string; sourcePosition: Position; currentPosition: Position } | null>(null)
  const [conditionType, setConditionType] = useState<ConditionType>(null)
  const [conditionValue, setConditionValue] = useState("")
  const [showChatPreview, setShowChatPreview] = useState(false)
  const [selectedToolIds, setSelectedToolIds] = useState<Record<string, string>>({}) // componentId -> toolId
  const [conversationTexts, setConversationTexts] = useState<Record<string, string>>({}) // componentId -> conversation text
  const [isSaving, setIsSaving] = useState(false)
  const [workflowName, _setWorkflowName] = useState("My Workflow") // Prefixed with _ as it's no longer actively used
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [savedWorkflowId, setSavedWorkflowId] = useState<number | null>(null)
  const [savingAgent, setSavingAgent] = useState(false)
  
  // Dedicated function to delete a component
  const deleteComponent = (componentId: string) => {
    console.log(`Attempting to delete component: ${componentId}`)
    
    // Create new arrays without this component and its connections
    const updatedComponents = components.filter(c => c.id !== componentId)
    const updatedConnections = connections.filter(
      conn => conn.from !== componentId && conn.to !== componentId
    )
    
    // Update state
    setComponents(updatedComponents)
    setConnections(updatedConnections)
    
    // Also clean up associated state
    const newSelectedToolIds = {...selectedToolIds}
    delete newSelectedToolIds[componentId]
    setSelectedToolIds(newSelectedToolIds)
    
    const newConversationTexts = {...conversationTexts}
    delete newConversationTexts[componentId]
    setConversationTexts(newConversationTexts)
    
    console.log(`Successfully deleted component ${componentId} and its connections`)
  }
  const [agentName, setAgentName] = useState("")
  const [agentDescription, setAgentDescription] = useState("")
  const [showAgentModal, setShowAgentModal] = useState(false)
  
  // Chatbot configuration - these state variables are used during agent creation
  // Underscore prefix added to state setters as they're not used in this component directly
  const [chatbotName, _setChatbotName] = useState("AI Assistant")
  const [systemPrompt, _setSystemPrompt] = useState("You are a helpful AI assistant.")
  
  // Style configuration - these state variables are used during agent creation
  const [topColor, _setTopColor] = useState("#1f2937")
  const [accentColor, _setAccentColor] = useState("#3B82F6")
  const [backgroundColor, _setBackgroundColor] = useState("#F3F4F6")
  
  // Fine tuning configuration - these state variables are used during agent creation
  const [temperature, _setTemperature] = useState(0.7)
  const [model, _setModel] = useState("gpt-4")
  const [maxTokens, _setMaxTokens] = useState(2000)
  
  // Right panel visibility state removed as it's no longer needed
  const workflowRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  // Fix malformed URLs and load existing workflow data
  useEffect(() => {
    // Check if URL is malformed with two question marks (e.g., id=31?auth=success)
    const currentUrl = window.location.href
    console.log('Current URL:', currentUrl)
    
    if (currentUrl.includes('?id=') && currentUrl.includes('?auth=')) {
      // The URL is malformed, fix it by replacing the second ? with &
      // Validate that the URL belongs to our domain before redirecting
      try {
        const urlObj = new URL(currentUrl);
        
        // Ensure we're only working with URLs on our domain
        if (urlObj.origin === window.location.origin) {
          const fixedUrl = currentUrl.replace('?auth=', '&auth=')
          console.log('Fixed URL:', fixedUrl)
          
          // Double-check the fixed URL is also on our domain
          const fixedUrlObj = new URL(fixedUrl);
          if (fixedUrlObj.origin === window.location.origin) {
            window.history.replaceState({}, document.title, fixedUrl)
            
            // Reload the page after fixing the URL to ensure proper parameter loading
            // Use our secure redirect utility to prevent open redirect vulnerabilities
            safeRedirect(fixedUrl)
          } else {
            console.error('Security warning: Fixed URL is not on our domain', fixedUrl);
            safeRedirect('/')
          }
        } else {
          console.error('Security warning: Current URL is not on our domain', currentUrl);
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error parsing URL:', error);
        window.location.href = '/';
      }
      return
    }
    
    // Log all search params for debugging
    console.log('URL Search Params:', Object.fromEntries(searchParams.entries()))
    
    const workflowId = searchParams.get('id')
    console.log('Detected workflow ID:', workflowId)
    
    if (!workflowId) {
      console.log('No workflow ID found in URL')
      return
    }

    // Set loading state
    const loadWorkflow = async () => {
      try {
        // First try to load from API
        console.log('Attempting to load workflow from API:', workflowId)
        const response = await fetch(`/api/workflows/${workflowId}`)
        
        if (!response.ok) {
          console.warn('API load failed, trying localStorage backup...')
          const restored = tryRestoreFromLocalStorage(workflowId)
          if (restored) {
            console.log('Successfully restored from localStorage backup')
            return // Skip the rest of the function if restored from backup
          }
          throw new Error('Failed to load workflow')
        }

        const workflowData = await response.json()
        if (!workflowData) {
          console.warn('API returned empty data, trying localStorage backup...')
          const restored = tryRestoreFromLocalStorage(workflowId)
          if (restored) return
        }

        // Set the workflow data
        setSavedWorkflowId(Number(workflowId))

        // Load components if they exist
        if (workflowData.components && Array.isArray(workflowData.components)) {
          setComponents(workflowData.components)
        }

        // Load connections if they exist
        if (workflowData.connections && Array.isArray(workflowData.connections)) {
          setConnections(workflowData.connections)
        }

        // Load conversation texts if they exist
        if (workflowData.conversationTexts) {
          setConversationTexts(workflowData.conversationTexts)
        }

        // Load selected tool IDs if they exist
        if (workflowData.selectedToolIds) {
          setSelectedToolIds(workflowData.selectedToolIds)
        }

        // Load chatbot settings if they exist
        if (workflowData.chatbotName) _setChatbotName(workflowData.chatbotName)
        if (workflowData.systemPrompt) _setSystemPrompt(workflowData.systemPrompt)
        
        // Load style settings if they exist
        if (workflowData.topColor) _setTopColor(workflowData.topColor)
        if (workflowData.accentColor) _setAccentColor(workflowData.accentColor)
        if (workflowData.backgroundColor) _setBackgroundColor(workflowData.backgroundColor)
        
        // Load fine tuning settings if they exist
        if (workflowData.temperature) _setTemperature(workflowData.temperature)
        if (workflowData.model) _setModel(workflowData.model)
        if (workflowData.maxTokens) _setMaxTokens(workflowData.maxTokens)

        console.log('Successfully loaded workflow:', workflowId)
      } catch (error) {
        console.error('Error loading workflow:', error)
      }
    }

    loadWorkflow()
  }, [searchParams])

  const addComponent = (type: ComponentType) => {
    const id = `${type}-${Date.now()}`
    const newComponent = {
      id,
      type,
      position: { x: 100, y: 100 + components.length * 120 },
      title: getComponentTitle(type),
    }
    
    // Initialize empty conversation text for conversation components
    if (type === "conversation") {
      setConversationTexts(prev => ({
        ...prev,
        [id]: ""
      }))
    }
    
    setComponents([...components, newComponent])
  }

  const getComponentTitle = (type: ComponentType) => {
    switch (type) {
      case "conversation":
        return "Conversation Starter"
      case "tools":
        return "Tools"
      case "prompt":
        return "Prompt"
      default:
        return "Component"
    }
  }

  const getComponentIcon = (type: ComponentType) => {
    switch (type) {
      case "conversation":
        return <MessageCircle className="h-5 w-5" />
      case "tools":
        return <Tool className="h-5 w-5 text-purple-600" />
      case "prompt":
        return <FileText className="h-5 w-5" />
      default:
        return <div className="h-5 w-5" />
    }
  }

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    setActiveComponent(id)
    const component = components.find((c) => c.id === id)
    if (component) {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setStartPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeComponent && startPosition && workflowRef.current) {
      const workflowRect = workflowRef.current.getBoundingClientRect()
      const newX = e.clientX - workflowRect.left - startPosition.x
      const newY = e.clientY - workflowRect.top - startPosition.y

      setComponents(
        components.map((component) =>
          component.id === activeComponent ? { ...component, position: { x: newX, y: newY } } : component,
        ),
      )
    }

    if (draggingConnection && workflowRef.current) {
      const workflowRect = workflowRef.current.getBoundingClientRect()
      setDraggingConnection({
        ...draggingConnection,
        currentPosition: {
          x: e.clientX - workflowRect.left,
          y: e.clientY - workflowRect.top,
        },
      })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingConnection) {
      e.stopPropagation()
      // We're dropping a dragged connection without completing it
      setDraggingConnection(null)
    }
    
    setActiveComponent(null)
    setStartPosition(null)
  }

  const handleConnectionStart = (e: React.MouseEvent, fromId: string, point: "left" | "right") => {
    e.stopPropagation()
    if (workflowRef.current) {
      const rect = workflowRef.current.getBoundingClientRect()
      // Find the source component
      const fromComponent = components.find(c => c.id === fromId)
      if (!fromComponent) return
      
      // Get the exact position based on the connection point
      const sourcePosition = {
        x: point === "left" 
          ? fromComponent.position.x // Left of the component
          : fromComponent.position.x + 300, // Right of the component
        y: fromComponent.position.y + 50, // Middle of the component vertically
      }
      
      // Set both source position and current mouse position
      setDraggingConnection({
        from: fromId,
        sourcePosition,
        currentPosition: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        },
      })
    }
  }

  // Connection line dragging is already handled in the handleMouseMove function above
  
  const handleCompleteConnection = (e: React.MouseEvent, toId: string) => {
    e.stopPropagation()
    if (draggingConnection && draggingConnection.from !== toId) {
      // Create a new connection with a unique ID and null condition
      const newConnection: Connection = {
        id: crypto.randomUUID(),
        from: draggingConnection.from,
        to: toId,
        condition: null
      }
      setConnections([...connections, newConnection])
      setDraggingConnection(null)
    }
  }

  const handleConnectionClick = (connectionId: string) => {
    const connection = connections.find(conn => conn.id === connectionId)
    if (connection) {
      // Initialize the form state with the current values
      setConditionType(connection.condition)
      setConditionValue(connection.value || "")
      setSelectedConnection(connectionId)
    }
  }

  const handleConnectionDoubleClick = (connectionId: string) => {
    setConnections(connections.filter(conn => conn.id !== connectionId))
    if (selectedConnection === connectionId) {
      setSelectedConnection(null)
    }
  }

  const saveConnectionCondition = () => {
    if (!selectedConnection) return

    setConnections(connections.map(conn => 
      conn.id === selectedConnection 
        ? { ...conn, condition: conditionType, value: conditionValue } 
        : conn
    ))
    
    // Reset and close the modal
    setSelectedConnection(null)
    setConditionType(null)
    setConditionValue("")
  }
  
  const getConnectionPoints = (fromId: string, toId: string) => {
    const fromComponent = components.find((c) => c.id === fromId)
    const toComponent = components.find((c) => c.id === toId)

    if (!fromComponent || !toComponent) return null

    // Sender point (right side of fromComponent)
    const fromX = fromComponent.position.x + 300 // right edge of component
    const fromY = fromComponent.position.y + 50 // middle of component vertically
    
    // Receiver point (left side of toComponent)
    const toX = toComponent.position.x // left edge of component
    const toY = toComponent.position.y + 50 // middle of component vertically

    return { fromX, fromY, toX, toY }
  }

  const handleToolSelect = (componentId: string, tool: any) => {
    // Use a single batch update to avoid multiple renders
    const updatedComponents = [...components];
    const componentIndex = updatedComponents.findIndex(comp => comp.id === componentId);
    
    if (componentIndex === -1) return;
    
    // Update the selected tool for this component
    if (tool) {
      setSelectedToolIds(prev => ({
        ...prev,
        [componentId]: tool.id
      }));
      
      // Update the component in our local copy
      updatedComponents[componentIndex] = {
        ...updatedComponents[componentIndex],
        title: tool.name,
        toolId: tool.id
      };
    } else {
      // Reset to default tools view
      setSelectedToolIds(prev => {
        const newState = {...prev};
        delete newState[componentId];
        return newState;
      });
      
      // Reset the component in our local copy
      updatedComponents[componentIndex] = {
        ...updatedComponents[componentIndex],
        title: "Tools",
        toolId: undefined
      };
    }
    
    // Set the updated components all at once
    setComponents(updatedComponents);
  }
  
  // Save workflow state to localStorage as a backup measure
  useEffect(() => {
    // Only save if we have components and a workflow ID
    const workflowId = searchParams.get('id')
    if (workflowId && components.length > 0) {
      // Create a backup of the current workflow state
      const workflowBackup = {
        id: workflowId,
        components,
        connections,
        conversationTexts,
        selectedToolIds,
        timestamp: new Date().toISOString()
      }
      
      // Save to localStorage
      safeLocalStorage.setItem(`workflow_backup_${workflowId}`, JSON.stringify(workflowBackup))
      console.log('Saved workflow backup to localStorage:', workflowId)
    }
  }, [components, connections, conversationTexts, selectedToolIds, searchParams])
  
  // Try to restore workflow from localStorage if API fails
  const tryRestoreFromLocalStorage = (workflowId: string) => {
    try {
      console.log('Attempting to restore workflow state for ID:', workflowId);
      
      // CRITICAL: Check all possible backup storage locations in order of reliability
      let backupJson = null;
      
      // 1. First check for complete workflow_state format (most complete)
      backupJson = safeLocalStorage.getItem(`workflow_state_${workflowId}`);
      if (backupJson) {
        console.log('Found primary workflow state backup');
      }
      
      // 2. If not found, try the workflow_backup format
      if (!backupJson) {
        backupJson = safeLocalStorage.getItem(`workflow_backup_${workflowId}`);
        if (backupJson) console.log('Found workflow backup');
      }
      
      // 3. Check for component-only backup (for first-time connections)
      let componentIdsJson = safeLocalStorage.getItem(`component_ids_${workflowId}`);
      let componentIds = [];
      if (componentIdsJson) {
        try {
          componentIds = JSON.parse(componentIdsJson);
          console.log('Found component IDs backup with', componentIds.length, 'components');
        } catch (e) {
          console.error('Error parsing component IDs backup:', e);
        }
      }
      
      // 4. If still not found, check the emergency backup format
      if (!backupJson) {
        const pendingRestoreId = safeLocalStorage.getItem('workflow_id_to_restore');
        if (pendingRestoreId === workflowId) {
          // Try to get backup using the pending workflow ID
          backupJson = safeLocalStorage.getItem(`components_backup_${workflowId}`);
          if (backupJson) console.log('Found emergency components backup');
        }
      }
      
      // No backups found at all
      if (!backupJson && componentIds.length === 0) {
        console.log('No backup found for workflow:', workflowId);
        return false;
      }
      
      // Process the backup data
      let backup: any = {};
      if (backupJson) {
        try {
          backup = JSON.parse(backupJson);
        } catch (e) {
          console.error('Error parsing backup JSON:', e);
          // If we have component IDs as fallback, we can still continue
          if (componentIds.length === 0) return false;
        }
      }
      
      // If we have component IDs but no backup, create a minimal backup object
      if (Object.keys(backup).length === 0 && componentIds.length > 0) {
        backup = { components: componentIds };
      }
      console.log('Found workflow backup:', backup)
      
      // Restore the workflow state
      if (backup.components && Array.isArray(backup.components)) {
        setComponents(backup.components)
      }
      
      if (backup.connections && Array.isArray(backup.connections)) {
        setConnections(backup.connections)
      }
      
      if (backup.conversationTexts) {
        setConversationTexts(backup.conversationTexts)
      }
      
      if (backup.selectedToolIds) {
        setSelectedToolIds(backup.selectedToolIds)
      }
      
      console.log('Successfully restored workflow from localStorage backup:', workflowId)
      return true
    } catch (error) {
      console.error('Error restoring from localStorage:', error)
      return false
    }
  }
  
  // Save workflow to database
  const saveWorkflow = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      // Get the current user ID from session or use a default one
      // This should be replaced with proper authentication
      const userId = "default-user";
      
      const workflowData = {
        name: workflowName,
        description: "Created with Workflow Builder",
        components,
        connections,
        conversationTexts,
        selectedToolIds,
        userId,
        // Chatbot configuration
        chatbotName,
        systemPrompt,
        // Style configuration
        topColor,
        accentColor,
        backgroundColor,
        // Fine tuning configuration
        temperature,
        model,
        maxTokens,
        // Additional configuration can be stored here
        extraConfig: {}
      };
      
      // Call the API to save the workflow
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save workflow');
      }
      
      // Store the saved workflow ID
      if (result.workflowId) {
        setSavedWorkflowId(result.workflowId);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Clear success message after 3 seconds
      
    } catch (error) {
      console.error('Error saving workflow:', error);
      setSaveError(typeof error === 'string' ? error : (error as Error).message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save as agent functionality
  const saveAsAgent = async () => {
    if (!savedWorkflowId) {
      // Save the workflow first
      await saveWorkflow();
      // If there's an error, it will be shown by the saveWorkflow function
      if (!savedWorkflowId) {
        setShowAgentModal(false);
        return;
      }
    }
    
    setSavingAgent(true);
    try {
      const userId = "default-user";
      
      const agentData = {
        name: agentName || workflowName,
        description: agentDescription || "Created from workflow: " + workflowName,
        workflowId: savedWorkflowId,
        userId,
        // Chatbot configuration
        chatbotName,
        systemPrompt,
        // Style configuration
        topColor,
        accentColor,
        backgroundColor,
        // Fine tuning configuration
        temperature,
        model,
        maxTokens
      };
      
      // Call the API to save the agent
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create agent');
      }
      
      // Redirect to the agents page on success
      safeRedirect("/agents");
      
    } catch (error) {
      console.error('Error creating agent:', error);
      setSaveError(typeof error === 'string' ? error : (error as Error).message || 'An error occurred creating agent');
    } finally {
      setSavingAgent(false);
      setShowAgentModal(false);
    }
  };
  
  // Get auth status from URL params
  const authStatus = searchParams.get('auth')
  const workflowId = searchParams.get('id')
  
  // Expose workflow state on window object for cross-page persistence
  useEffect(() => {
    // Only expose if we have a valid workflow
    if (workflowId && components.length > 0) {
      // Create a state object with all important workflow data
      const workflowState = {
        id: workflowId,
        components,
        connections,
        conversationTexts,
        selectedToolIds,
        timestamp: new Date().toISOString()
      };
      
      // Expose on window for direct access
      window.__WORKFLOW_STATE = workflowState;
      
      // Also save to localStorage
      safeLocalStorage.setItem(`workflow_state_${workflowId}`, JSON.stringify(workflowState));
      console.log('Exposed and saved workflow state, components:', components.length);
    }
  }, [workflowId, components, connections, conversationTexts, selectedToolIds]);
  
  // Safari detection helper
  const isSafari = useRef(false);
  
  // Detect Safari browser on first load
  useEffect(() => {
    // Check if browser is Safari
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      isSafari.current = /^((?!chrome|android).)*safari/i.test(ua);
      console.log('Browser detected as Safari:', isSafari.current);
    }
  }, []);
  
  // Direct component state restore on first render and after auth
  useEffect(() => {
    // Special Safari handling - check if we're returning from a redirect
    const safariRedirect = safeLocalStorage.getItem('safariWorkflowRedirect');
    if (safariRedirect === 'true' && isSafari.current) {
      console.log('Safari-specific redirect detected, attempting state restoration');
      const lastRedirectUrl = safeLocalStorage.getItem('lastRedirectUrl');
      // Extract workflow ID from the redirect URL if needed
      let urlWorkflowId = workflowId;
      
      if (!urlWorkflowId && lastRedirectUrl) {
        try {
          const urlObj = new URL(lastRedirectUrl, window.location.origin);
          urlWorkflowId = urlObj.searchParams.get('id');
          console.log('Extracted workflow ID from lastRedirectUrl:', urlWorkflowId);
        } catch (err) {
          console.error('Error extracting workflow ID from lastRedirectUrl:', err);
        }
      }
      
      if (urlWorkflowId && components.length === 0) {
        // Attempt to restore from localStorage
        tryRestoreFromLocalStorage(urlWorkflowId);
      }
      
      // Clear the Safari redirect flag
      safeLocalStorage.removeItem('safariWorkflowRedirect');
      safeLocalStorage.removeItem('lastRedirectUrl');
    }
    
    // Standard check: Are we returning from authentication?
    if (authStatus === 'success' && workflowId) {
      // Extract authentication details from URL parameters
      const service = searchParams.get('service');
      const componentId = searchParams.get('componentId');
      
      console.log('Detected return from authentication:', { 
        workflowId, 
        service, 
        componentId,
        componentsCount: components.length 
      });
      
      // If components are empty or we have a component ID in the URL, restore state
      if (components.length === 0 || componentId) {
        console.log('Components need restoration after authentication');
        
        // Get pending restore information
        const pendingRestore = safeLocalStorage.getItem('pending_workflow_restore');
        const workflowIdToRestore = safeLocalStorage.getItem('workflow_id_to_restore');
        
        // Try regular backup restoration first
        console.log('Trying regular backup restoration...');
        const restored = tryRestoreFromLocalStorage(workflowId);
        
        // If restoration failed or we need to add the component from the URL
        if ((!restored || componentId) && pendingRestore === 'true' && workflowIdToRestore === workflowId) {
          console.log('Checking for specific component restoration with componentId:', componentId);
          console.log('Found pending workflow restore, attempting alternate restoration...');
          
          // Try to get the saved state
          const savedStateJson = safeLocalStorage.getItem(`workflow_state_${workflowId}`);
          
          if (savedStateJson) {
            try {
              const savedState = JSON.parse(savedStateJson);
              console.log('Successfully loaded saved state:', savedState);
              
              // Restore all state properties
              if (savedState.components) setComponents(savedState.components);
              if (savedState.connections) setConnections(savedState.connections);
              
              // Explicitly log conversation texts before and after restoration
              console.log('Before restoration - conversationTexts:', conversationTexts);
              if (savedState.conversationTexts) {
                console.log('Restoring conversation texts:', savedState.conversationTexts);
                setConversationTexts(savedState.conversationTexts);
              }
              
              if (savedState.selectedToolIds) setSelectedToolIds(savedState.selectedToolIds);
              
              // Special check for conversation texts that might have been saved separately
              const specialConversationTextsBackup = safeLocalStorage.getItem(`conversation_texts_${workflowId}`);
              if (specialConversationTextsBackup) {
                try {
                  const backupTexts = JSON.parse(specialConversationTextsBackup);
                  console.log('Found special conversation texts backup:', backupTexts);
                  
                  if (Array.isArray(backupTexts) && backupTexts.length > 0) {
                    // Merge with any existing texts or use just the backup
                    const mergedTexts = savedState.conversationTexts || {};
                    
                    // Add backup texts to the conversation texts object
                    backupTexts.forEach((text, index) => {
                      if (text) {
                        mergedTexts[`text-${index + 1}`] = text;
                      }
                    });
                    
                    console.log('Setting merged conversation texts:', mergedTexts);
                    setConversationTexts(mergedTexts);
                  }
                } catch (err) {
                  console.error('Error restoring special conversation texts backup:', err);
                }
              }
              
              console.log('Workflow state restored from localStorage after authentication');
            } catch (err) {
              console.error('Error parsing saved workflow state:', err);
            }
          }
          
          // Handle component from the URL if present
          const urlComponentId = searchParams.get('componentId');
          if (urlComponentId && !components.some(c => c.id === urlComponentId)) {
            console.log('Adding component from URL parameter:', urlComponentId);
            const service = searchParams.get('service') || '';
            
            // Create a new component based on the component ID
            // Ensure it matches the WorkflowComponent type
            const newComponent = {
              id: urlComponentId,
              type: 'tool',
              title: `${service.charAt(0).toUpperCase() + service.slice(1)} Integration`,
              position: { x: 300, y: 300 },
              data: { 
                name: `${service.charAt(0).toUpperCase() + service.slice(1)} Integration`, 
                service: service,
                authenticated: true,
                configuring: false
              }
            };
            
            // Add the component to the workflow with proper type casting
            setComponents(prev => [...prev, newComponent as WorkflowComponent]);
            console.log('Added component from authentication flow:', newComponent);
          }
          
          // Clear restore flags
          safeLocalStorage.removeItem('pending_workflow_restore');
          safeLocalStorage.removeItem('workflow_id_to_restore');
          safeLocalStorage.removeItem(`conversation_texts_${workflowId}`);
        }
        
        // Fall back to trying regular backup if direct restore failed
        console.log('Trying regular backup restoration...');
      }
      
      // Fall back to trying regular backup if direct restore failed
      console.log('Trying regular backup restoration...');
      tryRestoreFromLocalStorage(workflowId);
    }
  }, [authStatus, workflowId, components.length])

  // Add ChromeFix component to prevent component deletion during Google authentication
  return (
    <div className="relative h-screen flex flex-col bg-gray-50">
      <ChromeFix 
        components={components}
        setComponents={setComponents}
        _conversationTexts={conversationTexts}
        setConversationTexts={setConversationTexts}
      />
      {/* Header */}
      <header className="bg-blue-600 text-white flex items-center justify-between px-6 py-4">
        {/* Left side: Logo and title */}
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-white" />
          <span className="text-lg font-semibold text-white">Workflow Builder</span>
        </div>

        {/* Center: Start button */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-dashed border-white text-white bg-transparent hover:bg-blue-700 hover:text-white"
              >
                start <Plus className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => addComponent("conversation")}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Conversation Starter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addComponent("tools")}>
                <Tool className="mr-2 h-4 w-4" />
                Tools
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addComponent("prompt")}>
                <FileText className="mr-2 h-4 w-4" />
                Prompt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-3">
          {/* Settings button removed */}
          
          {/* Save Button */}
          <Button 
            variant="ghost" 
            className="text-white hover:bg-blue-700"
            onClick={saveWorkflow}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                save
              </>
            )}
          </Button>
          
          {/* Create Agent Button removed */}
          
          {/* Save Status Message */}
          {saveSuccess && (
            <div className="absolute top-14 right-40 bg-green-500 text-white px-3 py-2 rounded shadow-md z-50">
              Workflow saved successfully!
            </div>
          )}
          
          {saveError && (
            <div className="absolute top-14 right-40 bg-red-500 text-white px-3 py-2 rounded shadow-md z-50">
              {saveError}
            </div>
          )}

          {/* Chat Button */}
          <Button 
            variant="ghost" 
            className="text-white hover:bg-blue-700"
            onClick={() => setShowChatPreview(true)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            chat
          </Button>

          {/* Back Button - Updated to go to create-agent page */}
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-blue-700 h-10 w-10"
            onClick={() => window.location.href = "/create-agent"}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Tabbed Settings Panel is now the main configuration interface */}
      
      {/* Agent Creation Modal */}
      {showAgentModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAgentModal(false)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Create AI Agent</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Agent Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder={workflowName}
                  className="w-full border rounded p-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                  placeholder="Describe what this agent does"
                  className="w-full border rounded p-2 min-h-[100px]"
                />
              </div>
              
              <div className="pt-4 border-t flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowAgentModal(false)}>Cancel</Button>
                <Button onClick={saveAsAgent} disabled={savingAgent}>
                  {savingAgent ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Agent'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <main
        className="flex-1 relative overflow-auto"
        style={{ minHeight: '5000px', width: '5000px' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={workflowRef}
      >
        {components.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              Click the "start +" button and select an option from the dropdown
            </p>
          </div>
        ) : (
          <>
            {/* SVG for connections */}
            <svg className="absolute inset-0 w-full h-full">
              {/* Define arrowhead marker */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
                </marker>
              </defs>
              {/* Permanent connections using straight lines */}
              {connections.map((connection) => {
                const points = getConnectionPoints(connection.from, connection.to)
                if (!points) return null

                const { fromX, fromY, toX, toY } = points
                
                // Calculate midpoint for displaying condition text
                const midX = (fromX + toX) / 2
                const midY = (fromY + toY) / 2

                return (
                  <g key={connection.id}>
                    {/* Create a bezier curve path for better visual connection */}
                    <path
                      d={`M ${fromX} ${fromY} C ${fromX + 50} ${fromY}, ${toX - 50} ${toY}, ${toX} ${toY}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="10"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConnectionClick(connection.id)
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        handleConnectionDoubleClick(connection.id)
                      }}
                    />
                    {/* Visible curved path with arrow */}
                    <path
                      d={`M ${fromX} ${fromY} C ${fromX + 50} ${fromY}, ${toX - 50} ${toY}, ${toX} ${toY}`}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                      pointerEvents="none"
                    />
                    {/* Condition badge if condition exists */}
                    {connection.condition && (
                      <g pointerEvents="none">
                        {/* Badge for condition */}
                        <rect
                          x={midX - 25}
                          y={midY - 15}
                          width={connection.value ? 70 : 50}
                          height="30"
                          rx="4"
                          fill="#3B82F6"
                        />
                        {/* Display condition text */}
                        <text
                          x={midX}
                          y={midY - 2}
                          textAnchor="middle"
                          fill="white"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {connection.condition.toUpperCase()}
                        </text>
                        
                        {/* Display value if exists */}
                        {connection.value && (
                          <text
                            x={midX}
                            y={midY + 10}
                            textAnchor="middle"
                            fill="white"
                            fontSize="8"
                          >
                            {connection.value}
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                )
              })}

              {/* Dragging connection preview with dashed straight line */}
              {draggingConnection && (
                <>
                  <line
                    x1={draggingConnection.sourcePosition.x}
                    y1={draggingConnection.sourcePosition.y}
                    x2={draggingConnection.currentPosition.x}
                    y2={draggingConnection.currentPosition.y}
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    pointerEvents="none"
                  />
                  {/* Blue circle that follows the mouse cursor */}
                  <circle
                    cx={draggingConnection.currentPosition.x}
                    cy={draggingConnection.currentPosition.y}
                    r="4"
                    fill="#3B82F6"
                    pointerEvents="none"
                  />
                </>
              )}
            </svg>
            
            {/* Connection Condition Modal */}
            {selectedConnection && (
              <div 
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setSelectedConnection(null)}
              >
                <div 
                  className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Connection Condition</h2>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedConnection(null)}
                      className="rounded-full h-8 w-8"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <label htmlFor="condition-type-trigger" className="text-lg font-medium">Condition</label>
                      <div className="col-span-2">
                        <Select value={conditionType || undefined} onValueChange={(value) => setConditionType(value as ConditionType)}>
                          <SelectTrigger id="condition-type-trigger">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="and">And</SelectItem>
                            <SelectItem value="or">Or</SelectItem>
                            <SelectItem value="if">If</SelectItem>
                            <SelectItem value="else">Else</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <label htmlFor="condition-value" className="text-lg font-medium">Value</label>
                      <div className="col-span-2">
                        <Input 
                          id="condition-value" 
                          placeholder="Enter condition value" 
                          value={conditionValue}
                          onChange={(e) => setConditionValue(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-8">
                    <Button 
                      variant="destructive" 
                      onClick={() => handleConnectionDoubleClick(selectedConnection)}
                      className="flex items-center"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Delete Connection
                    </Button>
                    
                    <Button onClick={saveConnectionCondition}>
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Components */}
            {components.map((component) => {
              return component.type === "tools" ? (
                <div
                  key={component.id}
                  className="absolute"
                  style={{
                    left: `${component.position.x}px`,
                    top: `${component.position.y}px`,
                    zIndex: activeComponent === component.id ? 10 : 1,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, component.id)}
                >
                  {/* Red X delete button */}
                  <div
                    role="button"
                    aria-label="Delete component"
                    tabIndex={0}
                    className="absolute top-2 right-2 z-20 h-8 w-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white cursor-pointer shadow-md"
                    onClick={() => deleteComponent(component.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        deleteComponent(component.id);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M18 6 6 18"></path>
                      <path d="m6 6 12 12"></path>
                    </svg>
                  </div>
                  
                  {/* Left connection point (receiver) - not shown for conversation starters */}
                  {component.type !== "conversation" && (
                    <div
                      className="absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-pointer"
                      onMouseUp={(e) => draggingConnection && handleCompleteConnection(e, component.id)}
                    />
                  )}
                  <div className="space-y-3">
                    <ToolsInterface 
                      selectedToolId={selectedToolIds[component.id]} 
                      onToolSelect={(tool) => handleToolSelect(component.id, tool)}
                      componentId={component.id}
                    />
                    
                    {/* Show variants from connected tools */}
                    {connections.filter(conn => conn.from === component.id || conn.to === component.id).map(connection => {
                      // Find the other component in the connection
                      const connectedId = connection.from === component.id ? connection.to : connection.from;
                      const connectedComponent = components.find(c => c.id === connectedId);
                      
                      // Only show variants from other tools components
                      if (connectedComponent?.type === "tools" && connectedComponent.id !== component.id) {
                        // Get tool service from connected component
                        const connectedToolService = connectedComponent.title?.toLowerCase() || '';
                        
                        return (
                          <div key={connection.id} className="mt-2 border-t pt-2">
                            <div className="flex items-center mb-1">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                              <span className="text-xs font-medium text-gray-700">Connected: {connectedToolService}</span>
                            </div>
                            
                            {/* Show connected calendar variants */}
                            {connectedToolService.includes("calendar") && (
                              <div className="grid grid-cols-2 gap-1 mt-1">
                                <div className="bg-purple-100 p-1 rounded text-xs text-purple-800 font-medium">
                                  checking_availability
                                </div>
                                <div className="bg-purple-100 p-1 rounded text-xs text-purple-800 font-medium">
                                  make_reservation
                                </div>
                              </div>
                            )}
                            
                            {/* Show connected google variants */}
                            {connectedToolService.includes("google") && (
                              <div className="grid grid-cols-2 gap-1 mt-1">
                                <div className="bg-blue-100 p-1 rounded text-xs text-blue-800 font-medium">
                                  search_query
                                </div>
                                <div className="bg-blue-100 p-1 rounded text-xs text-blue-800 font-medium">
                                  find_information
                                </div>
                              </div>
                            )}
                            
                            {/* Show connected email variants */}
                            {(connectedToolService.includes("email") || connectedToolService.includes("gmail")) && (
                              <div className="grid grid-cols-2 gap-1 mt-1">
                                <div className="bg-green-100 p-1 rounded text-xs text-green-800 font-medium">
                                  send_email
                                </div>
                                <div className="bg-green-100 p-1 rounded text-xs text-green-800 font-medium">
                                  check_inbox
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  {/* Right connection point (sender) */}
                  <div
                    className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-pointer"
                    onMouseDown={(e) => handleConnectionStart(e, component.id, "right")}
                  />
                </div>
              ) : (
                <Card
                  key={component.id}
                  className="absolute w-[300px] p-4 cursor-move shadow-md"
                  style={{
                    left: `${component.position.x}px`,
                    top: `${component.position.y}px`,
                    zIndex: activeComponent === component.id ? 10 : 1,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, component.id)}
                >
                  {/* Red X delete button for card component */}
                  <div
                    role="button"
                    aria-label="Delete component"
                    tabIndex={0}
                    className="absolute top-2 right-2 z-20 h-8 w-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white cursor-pointer shadow-md"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent drag
                      deleteComponent(component.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        deleteComponent(component.id);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M18 6 6 18"></path>
                      <path d="m6 6 12 12"></path>
                    </svg>
                  </div>

                  {/* Left connection point (receiver) - only for non-conversation components */}
                  {component.type !== "conversation" && (
                    <div
                      className="absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-pointer"
                      onMouseUp={(e) => draggingConnection && handleCompleteConnection(e, component.id)}
                    />
                  )}
                  <div className="flex items-center mb-2">
                    <div className="mr-2 text-blue-500">{getComponentIcon(component.type)}</div>
                    <div className="font-medium flex-1">{component.title}</div>
                  </div>
                  {component.type === "conversation" && (
                    <div className="space-y-3">
                      {/* Left connection point (receiver) is removed for conversation starters */}
                      <div 
                        className="bg-gray-50 p-2 rounded-md text-sm"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('ring-2', 'ring-blue-400');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                          
                          // Get the dropped text and insert it at cursor position or append to existing text
                          const droppedText = e.dataTransfer.getData('text/plain');
                          if (droppedText) {
                            // Get the current text
                            const currentText = conversationTexts[component.id] || '';
                            // Insert the template string for the variant
                            const newText = currentText + (currentText ? '\n' : '') + `{{${droppedText}}}`;
                            
                            // Update the conversation texts
                            setConversationTexts(prev => ({
                              ...prev,
                              [component.id]: newText
                            }));
                          }
                        }}
                      >
                        <textarea
                          id={`conversation-text-${component.id}`}
                          name={`conversation-text-${component.id}`}
                          className="w-full min-h-[60px] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded p-1"
                          value={conversationTexts[component.id] || ""}
                          onChange={(e) => setConversationTexts(prev => ({
                            ...prev,
                            [component.id]: e.target.value
                          }))}
                          placeholder="Drag and drop variants here or type conversation starter..."
                        />
                      </div>

                      {/* Show connected tool variants */}
                      {connections.filter(conn => conn.from === component.id || conn.to === component.id).map(connection => {
                        // Find the other component in the connection
                        const connectedId = connection.from === component.id ? connection.to : connection.from;
                        const connectedComponent = components.find(c => c.id === connectedId);
                        
                        // Only show variants for tools components
                        if (connectedComponent?.type === "tools") {
                          // Get tool service from connected component
                          const connectedToolService = connectedComponent.title?.toLowerCase() || '';
                          
                          return (
                            <div key={connection.id} className="mt-2 border-t pt-2">
                              <div className="flex items-center mb-1">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                <span className="text-xs font-medium text-gray-700">Connected: {connectedToolService}</span>
                              </div>
                              
                              {/* Show connected calendar variants */}
                              {connectedToolService.includes("calendar") && (
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  <div 
                                    className="bg-purple-100 p-1 rounded text-xs text-purple-800 font-medium cursor-move hover:bg-purple-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'checking_availability');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">checking_availability</span>
                                  </div>
                                  <div 
                                    className="bg-purple-100 p-1 rounded text-xs text-purple-800 font-medium cursor-move hover:bg-purple-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'make_reservation');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">make_reservation</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Show connected google variants */}
                              {connectedToolService.includes("google") && (
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  <div 
                                    className="bg-blue-100 p-1 rounded text-xs text-blue-800 font-medium cursor-move hover:bg-blue-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'search_query');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">search_query</span>
                                  </div>
                                  <div 
                                    className="bg-blue-100 p-1 rounded text-xs text-blue-800 font-medium cursor-move hover:bg-blue-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'find_information');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">find_information</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Show connected email variants */}
                              {(connectedToolService.includes("email") || connectedToolService.includes("gmail")) && (
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  <div 
                                    className="bg-green-100 p-1 rounded text-xs text-green-800 font-medium cursor-move hover:bg-green-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'send_email');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">send_email</span>
                                  </div>
                                  <div 
                                    className="bg-green-100 p-1 rounded text-xs text-green-800 font-medium cursor-move hover:bg-green-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'check_inbox');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">check_inbox</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  {component.type === "prompt" && (
                    <div className="space-y-3">
                      <div 
                        className="bg-gray-50 p-2 rounded-md text-sm"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('ring-2', 'ring-blue-400');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                          
                          // Get the dropped text and insert it at cursor position or append to existing text
                          const droppedText = e.dataTransfer.getData('text/plain');
                          if (droppedText) {
                            // Get the current text
                            const currentText = conversationTexts[component.id] || '';
                            // Insert the template string for the variant
                            const newText = currentText + (currentText ? '\n' : '') + `{{${droppedText}}}`;
                            
                            // Update the conversation texts
                            setConversationTexts(prev => ({
                              ...prev,
                              [component.id]: newText
                            }));
                          }
                        }}
                      >
                        <textarea
                          id={`prompt-text-${component.id}`}
                          name={`prompt-text-${component.id}`}
                          className="w-full min-h-[80px] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded p-1"
                          value={conversationTexts[component.id] || ""}
                          onChange={(e) => setConversationTexts(prev => ({
                            ...prev,
                            [component.id]: e.target.value
                          }))}
                          placeholder="Drag and drop variants here or type custom prompt..."
                        />
                      </div>
                      
                      {/* Show connected tool variants */}
                      {connections.filter(conn => conn.from === component.id || conn.to === component.id).map(connection => {
                        // Find the other component in the connection
                        const connectedId = connection.from === component.id ? connection.to : connection.from;
                        const connectedComponent = components.find(c => c.id === connectedId);
                        
                        // Only show variants for tools components
                        if (connectedComponent?.type === "tools") {
                          // Get the selected tool service - assume it's in the title if data is not available
                          const toolService = connectedComponent.title?.toLowerCase() || '';
                          
                          return (
                            <div key={connection.id} className="mt-2">
                              <div className="flex items-center mb-1">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                <span className="text-xs font-medium text-gray-700">Connected: {toolService || 'Tool'}</span>
                              </div>
                              
                              {toolService.includes("calendar") && (
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  <div 
                                    className="bg-purple-100 p-1 rounded text-xs text-purple-800 font-medium cursor-move hover:bg-purple-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()} /* Prevent parent component dragging */
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'checking_availability');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">checking_availability</span>
                                  </div>
                                  <div 
                                    className="bg-purple-100 p-1 rounded text-xs text-purple-800 font-medium cursor-move hover:bg-purple-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()} /* Prevent parent component dragging */
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'make_reservation');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">make_reservation</span>
                                  </div>
                                </div>
                              )}
                              
                              {toolService.includes("google") && (
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  <div 
                                    className="bg-blue-100 p-1 rounded text-xs text-blue-800 font-medium cursor-move hover:bg-blue-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()} /* Prevent parent dragging */
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'search_query');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">search_query</span>
                                  </div>
                                  <div 
                                    className="bg-blue-100 p-1 rounded text-xs text-blue-800 font-medium cursor-move hover:bg-blue-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()} /* Prevent parent dragging */
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'find_information');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">find_information</span>
                                  </div>
                                </div>
                              )}
                              
                              {toolService.includes("email") || toolService.includes("gmail") && (
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  <div 
                                    className="bg-green-100 p-1 rounded text-xs text-green-800 font-medium cursor-move hover:bg-green-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()} /* Prevent parent dragging */
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'send_email');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">send_email</span>
                                  </div>
                                  <div 
                                    className="bg-green-100 p-1 rounded text-xs text-green-800 font-medium cursor-move hover:bg-green-200 flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95"
                                    draggable="true"
                                    onMouseDown={(e) => e.stopPropagation()} /* Prevent parent dragging */
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData('text/plain', 'check_inbox');
                                      e.currentTarget.style.opacity = '0.4';
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                  >
                                    <span className="pointer-events-none">check_inbox</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  {/* Right connection point (sender) */}
                  <div
                    className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-pointer"
                    onMouseDown={(e) => handleConnectionStart(e, component.id, "right")}
                  />
                </Card>
              );
            })}
          </>
        )}
        
        {/* Chat Preview Modal */}
        {showChatPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl h-[600px] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold">Chat Preview</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowChatPreview(false)}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <ChatInterface 
                  name={chatbotName}
                  systemPrompt={systemPrompt}
                  topColor={topColor}
                  accentColor={accentColor}
                  backgroundColor={backgroundColor}
                  conversationStarters={Object.values(conversationTexts).filter(text => text.trim() !== "")}
                  onRemoveStarter={(index) => {
                    // Get all non-empty conversation texts
                    const starters = Object.entries(conversationTexts)
                      .filter(([_, text]) => text.trim() !== "")
                      .map(([componentId, text]) => ({ componentId, text }));
                    
                    // Get the component ID for the starter at the given index
                    if (index >= 0 && index < starters.length) {
                      const { componentId } = starters[index];
                      
                      // Create a new conversation texts object without the removed starter
                      const newConversationTexts = { ...conversationTexts };
                      newConversationTexts[componentId] = ""; // Clear the text for this component
                      
                      // Update state
                      setConversationTexts(newConversationTexts);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
