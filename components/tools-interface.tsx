"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Search, Settings, Mail, Calendar, FileText, X, Lock, CheckCircle, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"

interface Tool {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  service: string
  scopes?: string[]
}

const tools: Tool[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Access and process emails",
    icon: <Mail className="h-6 w-6" />,
    color: "bg-red-100 text-red-600",
    service: "gmail",
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.labels'
    ]
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Manage events and schedules",
    icon: <Calendar className="h-6 w-6" />,
    color: "bg-green-100 text-green-600",
    service: "calendar",
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and manage files",
    icon: <FileText className="h-6 w-6" />,
    color: "bg-blue-100 text-blue-600",
    service: "drive",
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]
  },
  // Add more tools as needed
]

interface ToolsInterfaceProps {
  componentId?: string
  selectedToolId?: string
  onToolSelect?: (tool: Tool) => void
  onSubmit?: (content: any) => void
  readonly?: boolean
  workflowComponents?: any[]
  workflowConnections?: any[]
}

export function ToolsInterface({ onToolSelect, selectedToolId, componentId, workflowComponents, workflowConnections }: ToolsInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [authStatus, setAuthStatus] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const searchParams = useSearchParams()
  
  // Use useEffect to update selectedTools when selectedToolId changes instead of during render
  useEffect(() => {
    if (selectedToolId) {
      setSelectedTools([selectedToolId])
      // Check auth status when a tool is selected
      const tool = tools.find(t => t.id === selectedToolId)
      if (tool) {
        checkAuthStatus(tool.service)
      }
    }
  }, [selectedToolId])
  
  // Handle OAuth callback
  useEffect(() => {
    const authSuccess = searchParams.get('auth')
    const service = searchParams.get('service')
    const authComponentId = searchParams.get('componentId')
    
    if (authSuccess === 'success' && service && authComponentId === componentId) {
      // Update auth status after successful authentication
      setAuthStatus(prev => ({
        ...prev,
        [service]: true
      }))
    }
  }, [searchParams, componentId])
  
  // Check authentication status for a service
  const checkAuthStatus = async (service: string) => {
    try {
      setIsLoading(prev => ({ ...prev, [service]: true }))
      const response = await fetch(`/api/auth/status?service=${service}`)
      const data = await response.json()
      
      setAuthStatus(prev => ({
        ...prev,
        [service]: data.authenticated
      }))
    } catch (error) {
      console.error(`Error checking auth status for ${service}:`, error)
      setAuthStatus(prev => ({
        ...prev,
        [service]: false
      }))
    } finally {
      setIsLoading(prev => ({ ...prev, [service]: false }))
    }
  }
  
  // Function to handle tool authentication
  const handleAuth = (tool: Tool) => {
    if (!componentId) return;
    
    // Create emergency backup of all workflow state
    try {
      // Attach data directly to the window object for preservation across page loads
      if (typeof window !== 'undefined') {
        // Create a simple backup object that doesn't rely on complex types
        const backupState: {
          components: string[],
          connections: any[],
          timestamp: string
        } = {
          components: [],
          connections: [],
          timestamp: new Date().toISOString()
        };
        
        // Get components from DOM as a reliable fallback
        const allElements = document.querySelectorAll('[data-component-id]');
        if (allElements && allElements.length > 0) {
          // Extract component IDs and filter out nulls
          const domComponents = Array.from(allElements)
            .map(el => el.getAttribute('data-component-id'))
            .filter(id => id !== null) as string[];
            
          backupState.components = domComponents;
          console.log('Found', domComponents.length, 'components in DOM');
        }
        
        // Also use the passed workflow components if available (more reliable)
        if (workflowComponents && workflowComponents.length > 0) {
          console.log('Using passed workflowComponents for backup:', workflowComponents.length);
          // Convert workflowComponents to strings if they aren't already
          const componentIds = workflowComponents.map(c => c.toString());
          // Merge with existing components using Set to avoid duplicates
          backupState.components = [...new Set([...backupState.components, ...componentIds])];
        }
        
        if (workflowConnections && workflowConnections.length > 0) {
          backupState.connections = workflowConnections;
        }
        
        // Store directly on window for emergency access
        (window as any)._WORKFLOW_BACKUP = backupState;
        console.log('CRITICAL: Created direct window backup with', backupState.components.length, 'components');
      }
    } catch (err) {
      console.error('Error creating emergency backup:', err);
    }
    
    // Extract workflow ID from URL to save with components
    let workflowId = null;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      workflowId = urlParams.get('id');
      console.log('Extracted workflow ID for component preservation:', workflowId);
    } catch (err) {
      console.error('Error extracting workflow ID:', err);
    }
    
    // CRITICAL: Directly preserve current workflow state before redirecting
    if (workflowId) {
      try {
        // Store any DOM components directly in multiple formats to ensure preservation
        const allComponentElements = document.querySelectorAll('[data-component-id]');
        const domComponentIds = Array.from(allComponentElements)
          .map(el => el.getAttribute('data-component-id'))
          .filter(id => id !== null) as string[];
        
        // If we have passed components from parent, use those (they're more reliable)
        const componentIds = workflowComponents?.map(c => c.toString()) || domComponentIds;
        const connectionData = workflowConnections || [];
        
        console.log('DIRECT COMPONENT ACCESS - Components:', componentIds.length);
        
        // Save multiple backups of component data to ensure preservation
        if (componentIds.length > 0) {
          // 1. Save as direct components
          localStorage.setItem(`direct_components_${workflowId}`, JSON.stringify(componentIds));
          // 2. Save connections if available
          if (connectionData.length > 0) {
            localStorage.setItem(`direct_connections_${workflowId}`, JSON.stringify(connectionData));
          }
          // 3. Also save as plain string array for maximum compatibility
          localStorage.setItem(`component_ids_plain_${workflowId}`, JSON.stringify(componentIds));
        }
        
        // Also get all workflow components from the DOM as backup
        const domElements = document.querySelectorAll('[data-component-id]');
        console.log('Found DOM components to preserve:', domElements.length);
        
        // Specifically look for conversation text inputs to preserve them
        const conversationInputs = document.querySelectorAll('input[placeholder="Enter conversation starter"]');
        const conversationTexts = Array.from(conversationInputs).map(input => (input as HTMLInputElement).value).filter(Boolean);
        console.log('Found conversation texts to preserve:', conversationTexts);
        
        // Save conversation texts separately as a special backup
        if (conversationTexts.length > 0) {
          localStorage.setItem(`conversation_texts_${workflowId}`, JSON.stringify(conversationTexts));
          console.log('Saved conversation texts backup specifically');
        }
        
        // Get the complete workflow state from window if available - CRITICAL FOR FIRST CONNECTION
        let workflowState;

        // Try to get the full state from the window object first (this is the most reliable method)
        if (window.__WORKFLOW_STATE) {
          console.log('Found complete workflow state in window object, using this for backup');
          workflowState = window.__WORKFLOW_STATE;
        } else {
          // Fallback to minimal state - this will work for subsequent connections but not first one
          console.log('No window state found, creating minimal backup - may not preserve all components');
          // Use DOM elements to create a backup of component IDs
          const backupComponents = Array.from(domElements || [])
            .map(el => el.getAttribute('data-component-id'))
            .filter(id => id !== null) as string[];
            
          workflowState = {
            components: backupComponents,
            conversationTexts,
            timestamp: new Date().toISOString()
          };
        }
        
        // Save multiple backups to ensure state is preserved
        // 1. Main workflow state backup
        localStorage.setItem(`workflow_state_${workflowId}`, JSON.stringify(workflowState));
        
        // 2. Also save a raw backup of component IDs as string array
        const elementComponentIds = Array.from(domElements).map(el => el.getAttribute('data-component-id'));
        localStorage.setItem(`component_ids_${workflowId}`, JSON.stringify(elementComponentIds));
        
        // 3. Set restoration flags
        localStorage.setItem('pending_workflow_restore', 'true');
        localStorage.setItem('workflow_id_to_restore', workflowId);
        localStorage.setItem('last_auth_redirect_time', new Date().toISOString());
        console.log('Created emergency workflow state backup for restoration after auth with', componentIds.length, 'components');
      } catch (err) {
        console.error('Error preserving workflow state:', err);
      }
    }
    
    // Save the current full URL to localStorage before redirecting
    // This ensures we can return to the exact same workflow with all parameters
    let currentUrl = window.location.href;
    
    // Make sure we're always using /workflow/new and never /new-agent
    if (currentUrl.includes('/new-agent')) {
      console.warn('Detected /new-agent URL, fixing to use /workflow/new instead');
      currentUrl = currentUrl.replace('/new-agent', '/workflow/new');
    }
    
    // Also save a direct workflow URL as a backup, in case the original URL gets mangled
    if (workflowId) {
      const directWorkflowUrl = `${window.location.origin}/workflow/new?id=${workflowId}`;
      localStorage.setItem('direct_workflow_url', directWorkflowUrl);
      console.log('Saved direct workflow URL:', directWorkflowUrl);
    }
    
    localStorage.setItem('auth_return_url', currentUrl);
    console.log('Saved return URL:', currentUrl);
    
    // Redirect to the auth page with service and componentId
    window.location.href = `/auth/google?service=${tool.service}&componentId=${componentId}`;
  }
  
  // Function to directly open a tool with one click
  const openTool = (tool: Tool) => {
    // First select the tool
    if (onToolSelect) {
      onToolSelect(tool);
    }
    
    setSelectedTools([tool.id]);
    
    // If tool requires authentication and isn't authenticated yet, handle auth
    if (tool.service && !authStatus[tool.service]) {
      handleAuth(tool);
      return;
    }
    
    // If tool is already authenticated or doesn't require auth, open it directly
    console.log(`Opening tool: ${tool.name}`);
    // For Gmail
    if (tool.id === 'gmail') {
      window.open('https://mail.google.com', '_blank');
    }
    // For Calendar
    else if (tool.id === 'calendar') {
      window.open('https://calendar.google.com', '_blank');
    }
    // For Google Drive
    else if (tool.id === 'google-drive') {
      window.open('https://drive.google.com', '_blank');
    }
    // Add more tools as needed
  }

  // State for Tool specific state
  const [calendarId, setCalendarId] = useState<string>('')
  const [availabilityStart, setAvailabilityStart] = useState<string>('09:00')
  const [availabilityEnd, setAvailabilityEnd] = useState<string>('17:00')
  const [selectedPromptVariant, setSelectedPromptVariant] = useState<string>('check-available-time')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  
  // State for user's real calendars
  const [userCalendars, setUserCalendars] = useState<Array<{id: string, summary: string, primary?: boolean}>>([])  
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false)
  
  // Fetch user's calendars when authenticated
  useEffect(() => {
    // Only fetch calendars when calendar tool is selected and authenticated
    if (selectedToolId === 'calendar' && authStatus['calendar']) {
      const fetchCalendars = async () => {
        setIsLoadingCalendars(true);
        try {
          const response = await fetch('/api/google/calendars');
          const data = await response.json();
          if (data.calendars) {
            setUserCalendars(data.calendars);
            
            // If we got calendars and no calendar ID is selected yet, select the primary calendar
            if (data.calendars.length > 0 && !calendarId) {
              const primaryCalendar = data.calendars.find((cal: any) => cal.primary) || data.calendars[0];
              setCalendarId(primaryCalendar.id);
            }
          }
        } catch (error) {
          console.error('Error fetching calendars:', error);
        } finally {
          setIsLoadingCalendars(false);
        }
      };
      fetchCalendars();
    }
  }, [selectedToolId, authStatus, calendarId]);

  // Handle calendar event creation
  const handleCreateCalendarEvent = () => {
    if (!calendarId) {
      alert('Please enter a Calendar ID');
      return;
    }
    
    setIsCreatingEvent(true);
    
    // This would typically call your backend API to create an event
    // For now, we'll just simulate it with a timeout
    setTimeout(() => {
      alert(`Event will be created in calendar: ${calendarId}\nOnly within hours: ${availabilityStart} - ${availabilityEnd}\nUsing template: ${selectedPromptVariant}`);
      setIsCreatingEvent(false);
    }, 1000);
  }
  
  const promptVariants = [
    'check-available-time',
    'book-meeting',
    'reschedule-meeting',
    'cancel-meeting',
    'list-upcoming-events'
  ]
  
  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // This function is now replaced by openTool, but kept as reference with _ prefix
  const _toggleTool = (toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (tool && onToolSelect) {
      onToolSelect(tool);
    }
    
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [toolId] // Only select one tool at a time
    );
  }

  // Determine if this is showing the calendar tool
  const isCalendarToolSelected = selectedToolId === 'calendar';
  
  return (
    <div className="rounded-lg border bg-card text-card-foreground w-[300px] p-4 shadow-md">
      {/* Header - Only show for non-calendar tools */}
      {!isCalendarToolSelected && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-purple-100">
              <Search className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-purple-600">Tool</h2>
          </div>
        </div>
      )}

      {/* Search Input - Only show for non-calendar tools */}
      {!isCalendarToolSelected && (
        <div className="relative mb-4">
          <label htmlFor="tools-search" className="sr-only">Search tools</label>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="tools-search"
            name="tools-search"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full bg-gray-50 border-0 focus-visible:ring-purple-500"
            aria-label="Search tools"
          />
          <button 
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
            aria-label="Settings"
            type="button"
          >
            <Settings className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      )}

      {/* Tools List */}
      <div className="space-y-2">
        {/* Show tool details if a tool is selected */}
        {selectedToolId && (
          <div>
            {(() => {
              const tool = tools.find(t => t.id === selectedToolId);
              if (!tool) return null;
              
              return (
                <div className="bg-gray-50 p-4 rounded-lg">
                  {tool.id === 'calendar' ? (
                    <div className="flex flex-col items-center gap-1 mb-4">
                      <div className={cn("p-3 rounded-full", tool.color)}>
                        {tool.icon}
                      </div>
                      <h3 className="text-xl font-bold text-center">Google Calendar</h3>
                      <p className="text-sm text-gray-600 text-center">Manage events and create meetings</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={cn("p-2 rounded-lg", tool.color)}>
                          {tool.icon}
                        </div>
                        <h3 className="text-lg font-medium">{tool.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
                    </>
                  )}
                  
                  {/* Authentication status */}
                  <div className="mb-4 p-3 rounded-lg bg-white border">
                    {isLoading[tool.service] ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="animate-spin">⟳</span> Checking authentication status...
                      </div>
                    ) : authStatus[tool.service] ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" /> Connected to {tool.name}
                        </div>
                        
                        {/* Calendar specific settings - only show when authenticated */}
                        {tool.id === 'calendar' && (
                          <div className="mt-3 border-t pt-3 space-y-3">
                            <div>
                              <label htmlFor="calendar-id" className="block text-sm font-medium text-gray-700 mb-1">
                                Calendar ID*
                              </label>
                              <select
                                id="calendar-id"
                                name="calendar-id"
                                value={calendarId}
                                onChange={(e) => setCalendarId(e.target.value)}
                                className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white focus:ring-green-500 focus:border-green-500"
                              >
                                <option value="" disabled>Select a calendar</option>
                                {isLoadingCalendars ? (
                                  <option value="" disabled>Loading your calendars...</option>
                                ) : userCalendars.length > 0 ? (
                                  userCalendars.map(calendar => (
                                    <option key={calendar.id} value={calendar.id}>
                                      {calendar.summary} {calendar.primary ? '(Primary)' : ''}
                                    </option>
                                  ))
                                ) : (
                                  <>
                                    <option value="primary">Primary Calendar</option>
                                    <option value="work@example.com">Work Calendar</option>
                                    <option value="personal@example.com">Personal Calendar</option>
                                  </>
                                )}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                {isLoadingCalendars ? 'Loading your calendars...' : 
                                 userCalendars.length > 0 ? `${userCalendars.length} calendars found` : 
                                 'Select one of your available calendars'}
                              </p>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Availability Hours
                              </label>
                              <div className="flex gap-2 items-center">
                                <select
                                  id="availability-start"
                                  name="availability-start"
                                  value={availabilityStart}
                                  onChange={(e) => setAvailabilityStart(e.target.value)}
                                  className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white focus:ring-green-500 focus:border-green-500"
                                >
                                  {[...Array(24)].map((_, i) => {
                                    const hour = i < 10 ? `0${i}:00` : `${i}:00`;
                                    return <option key={hour} value={hour}>{hour}</option>;
                                  })}
                                </select>
                                <span className="text-sm font-medium">to</span>
                                <select
                                  id="availability-end"
                                  name="availability-end"
                                  value={availabilityEnd}
                                  onChange={(e) => setAvailabilityEnd(e.target.value)}
                                  className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white focus:ring-green-500 focus:border-green-500"
                                >
                                  {[...Array(24)].map((_, i) => {
                                    const hour = i < 10 ? `0${i}:00` : `${i}:00`;
                                    return <option key={hour} value={hour}>{hour}</option>;
                                  })}
                                </select>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Only allow meetings during these hours</p>
                            </div>
                            
                            <div>
                              <label htmlFor="prompt-variant" className="block text-sm font-medium text-gray-700 mb-1">
                                Prompt Template
                              </label>
                              <select
                                id="prompt-variant"
                                name="prompt-variant"
                                value={selectedPromptVariant}
                                onChange={(e) => setSelectedPromptVariant(e.target.value)}
                                className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white focus:ring-purple-500 focus:border-purple-500"
                              >
                                {promptVariants.map((variant) => (
                                  <option key={variant} value={variant}>
                                    {variant.replace(/-/g, ' ')}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">Select the calendar action to use</p>
                            </div>
                            
                            <div className="pt-2">
                              <Button 
                                onClick={handleCreateCalendarEvent}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                                disabled={isCreatingEvent || !calendarId}
                              >
                                {isCreatingEvent ? (
                                  <>
                                    <span className="animate-spin mr-2">⟳</span> Creating Event...
                                  </>
                                ) : (
                                  'Create Calendar Event'
                                )}
                              </Button>
                              <p className="text-xs text-gray-500 mt-1 text-center">
                                Events created will respect your {availabilityStart}-{availabilityEnd} availability
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertCircle className="h-4 w-4" /> Not connected to {tool.name}
                        </div>
                        <Button 
                          onClick={() => handleAuth(tool)}
                          className="flex items-center gap-2 bg-[#3C82F6] hover:bg-blue-700 w-full mt-2"
                        >
                          <Lock className="h-4 w-4" /> Connect {tool.name}
                        </Button>
                        <div className="text-xs text-gray-500 mt-1">
                          <p>Required scopes:</p>
                          <ul className="list-disc pl-4 mt-1">
                            {tool.scopes?.map((scope, i) => {
                              // Simplify scope for display
                              const simplifiedScope = scope.split('/').pop()?.replace(/\./g, ' ')
                              return <li key={i}>{simplifiedScope}</li>
                            })}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => onToolSelect?.(undefined as any)}
                    className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Change tool
                  </button>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Show the list of tools if no tool is selected */}
        {!selectedToolId && filteredTools.map(tool => (
          <button
            key={tool.id}
            onClick={() => openTool(tool)} // Changed to directly open tool with one click
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              "hover:bg-gray-50",
              selectedTools.includes(tool.id) ? "ring-2 ring-purple-500" : ""
            )}
          >
            <div className={cn("p-2 rounded-lg", tool.color)}>
              {tool.icon}
            </div>
            <div className="text-left">
              <div className="font-medium">{tool.name}</div>
              <div className="text-sm text-gray-500">{tool.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

