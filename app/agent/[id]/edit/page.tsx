"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { ChatInterface } from "@/components/chat-interface"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ColorPalette } from "@/components/ui/color-palette"
import { RefreshCw, Plus, Trash2, Globe, File, Settings } from "lucide-react"

export default function EditAgentPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  // Basic state
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Agent configuration state
  const [name, setName] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.")
  
  // Style state
  const [topColor, setTopColor] = useState("#1f2937")
  const [accentColor, setAccentColor] = useState("#3B82F6")
  const [backgroundColor, setBackgroundColor] = useState("#F3F4F6")
  const [outsideButtonUrl, setOutsideButtonUrl] = useState("")
  const [outsideButtonText, setOutsideButtonText] = useState("Chat with our AI assistant!")
  
  // Sync color changes with workflow
  const updateWorkflowColors = async (colors: {topColor?: string, accentColor?: string, backgroundColor?: string}) => {
    if (!workflowId) return // Only update if we have a workflowId
    
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...colors,
          userId: "default-user"
        }),
      })
      
      if (!response.ok) {
        console.error('Failed to update workflow colors:', response.status)
        const errorText = await response.text()
        console.error('Error details:', errorText)
      } else {
        console.log('Workflow colors updated successfully')
      }
    } catch (error) {
      console.error('Error updating workflow colors:', error)
    }
  }
  
  // Enhanced color setters that also update workflow
  const handleTopColorChange = (color: string) => {
    setTopColor(color)
    updateWorkflowColors({ topColor: color })
  }
  
  const handleAccentColorChange = (color: string) => {
    setAccentColor(color)
    updateWorkflowColors({ accentColor: color })
  }
  
  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color)
    updateWorkflowColors({ backgroundColor: color })
  }
  
  // File upload state
  const [fileUploadStatus, setFileUploadStatus] = useState<{uploading: boolean; error: string | null;}>({ uploading: false, error: null })
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  
  // Link extraction state
  const [extractedLinks, setExtractedLinks] = useState<string[]>([])
  const [linkUrl, setLinkUrl] = useState("")
  const [extractionStatus, setExtractionStatus] = useState<{extracting: boolean; error: string | null;}>({ extracting: false, error: null })
  
  // Fine tuning state and temperature (0-100 for UI, 0-1 for API)
  const [temperature, setTemperature] = useState(70)
  
  // Workflow and conversation starters
  const [workflowId, setWorkflowId] = useState<number | null>(null)
  const [_workflowData, setWorkflowData] = useState<any>(null)
  const [conversationStarters, setConversationStarters] = useState<string[]>([])
  
  // Navigate to workflow page after saving temporary state
  const handleWorkflowClick = async () => {
    // Create or update the workflow with current values, but don't show it as saved in the UI
    try {
      setIsSaving(true) // Show saving indicator
      
      // First, create a workflow if none exists
      let currentWorkflowId = workflowId;
      if (!currentWorkflowId) {
        try {
          // Create a basic workflow first
          const workflowResponse = await fetch('/api/workflows', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `${name} Workflow`,
              description: "Auto-created workflow for agent",
              components: [],
              connections: [],
              conversationTexts: {},
              selectedToolIds: {},
              userId: "default-user",
              // Include styling configuration
              chatbotName: name,
              systemPrompt: systemPrompt,
              topColor: topColor,
              accentColor: accentColor,
              backgroundColor: backgroundColor,
              // Fine tuning configuration
              temperature: temperature / 100,
              model: "llama-3.1",
              maxTokens: 2000
            }),
          });

          if (!workflowResponse.ok) {
            throw new Error(`Failed to create workflow: ${workflowResponse.status}`);
          }

          const workflowResult = await workflowResponse.json();
          currentWorkflowId = workflowResult.workflowId;
          setWorkflowId(currentWorkflowId) // Update state with new ID
          console.log(`Created workflow with ID: ${currentWorkflowId}`);
        } catch (workflowError) {
          console.error('Error creating workflow:', workflowError);
          alert('Failed to create workflow before navigation');
          setIsSaving(false);
          return; // Stop navigation if workflow creation fails
        }
      } else {
        // Update existing workflow with all current values
        try {
          const updateResponse = await fetch(`/api/workflows/${currentWorkflowId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `${name} Workflow`,
              description: "Updated workflow for agent",
              chatbotName: name,
              systemPrompt: systemPrompt,
              topColor: topColor,
              accentColor: accentColor,
              backgroundColor: backgroundColor,
              temperature: temperature / 100,
              model: "llama-3.1",
              maxTokens: 2000,
              userId: "default-user"
            }),
          });
          
          if (!updateResponse.ok) {
            throw new Error(`Failed to update workflow: ${updateResponse.status}`);
          }
          
          console.log('Workflow updated before navigation');
        } catch (updateError) {
          console.error('Error updating workflow:', updateError);
          alert('Failed to update workflow before navigation');
          setIsSaving(false);
          return; // Stop navigation if update fails
        }
      }
      
      setIsSaving(false) // Hide saving indicator
      
      // Navigate to workflow page with the current ID
      router.push(`/workflow/new?id=${currentWorkflowId}`);
    } catch (error) {
      console.error('Error in workflow navigation process:', error);
      setIsSaving(false);
      alert('An error occurred. Please try again.');
    }
  }
  
  // Handle back/cancel - go home
  const handleCancel = () => {
    router.push("/")
  }
  
  // Load agent data
  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch agent data
        const response = await fetch(`/api/agents/${agentId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch agent data: ${response.status}`)
        }
        
        const data = await response.json()
        const agent = data.agent
        
        if (!agent) {
          throw new Error('Agent data not found')
        }
        
        // Set agent configuration
        setName(agent.name || "")
        setSystemPrompt(agent.systemPrompt || "You are a helpful AI assistant.")
        
        // Set style configuration
        setTopColor(agent.topColor || "#1f2937")
        setAccentColor(agent.accentColor || "#3B82F6")
        setBackgroundColor(agent.backgroundColor || "#F3F4F6")
        setOutsideButtonText(agent.outsideButtonText || "Chat with our AI assistant!")
        setOutsideButtonUrl(agent.outsideButtonUrl || "")
        
        // Set fine tuning configuration
        setTemperature(Math.round((agent.temperature || 0.7) * 100))
        
        // Set workflow ID
        setWorkflowId(agent.workflowId || null)
        
        // Set conversation starters if available
        if (agent.extraConfig && agent.extraConfig.conversationStarters) {
          setConversationStarters(agent.extraConfig.conversationStarters || [])
        }
        
        // Set training data if available
        if (agent.extraConfig && agent.extraConfig.trainingData) {
          if (agent.extraConfig.trainingData.extractedLinks) {
            setExtractedLinks(agent.extraConfig.trainingData.extractedLinks || [])
          }
          if (agent.extraConfig.trainingData.uploadedFiles) {
            setUploadedFiles(agent.extraConfig.trainingData.uploadedFiles || [])
          }
        }
        
        // If there's a workflowId, fetch the workflow data as well
        if (agent.workflowId) {
          try {
            const workflowResponse = await fetch(`/api/workflows/${agent.workflowId}`)
            
            if (workflowResponse.ok) {
              const workflowData = await workflowResponse.json()
              setWorkflowData(workflowData)
              
              // Extract conversation starters if they exist
              if (workflowData.conversationTexts) {
                const starters = Object.values(workflowData.conversationTexts)
                if (starters.length > 0) {
                  setConversationStarters(starters as string[])
                }
              }
            }
          } catch (workflowError) {
            console.error('Error fetching workflow data:', workflowError)
            // Don't prevent loading the agent even if workflow fetch fails
          }
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading agent:', error)
        setError('Failed to load agent data. Please try again.')
        setIsLoading(false)
      }
    }
    
    if (agentId) {
      fetchAgentData()
    }
  }, [agentId])
  
  // Save agent changes
  const saveAgent = async () => {
    try {
      setIsSaving(true)

      // Update the existing workflow if it exists
      let currentWorkflowId = workflowId;
      if (currentWorkflowId) {
        try {
          const workflowResponse = await fetch(`/api/workflows/${currentWorkflowId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `${name} Workflow`,
              description: "Updated workflow for agent",
              chatbotName: name,
              systemPrompt: systemPrompt,
              topColor: topColor,
              accentColor: accentColor,
              backgroundColor: backgroundColor,
              temperature: temperature / 100,
              model: "llama-3.1",
              maxTokens: 2000,
              userId: "default-user"
            }),
          });

          if (!workflowResponse.ok) {
            throw new Error(`Failed to update workflow: ${workflowResponse.status}`);
          }
        } catch (workflowError) {
          console.error('Error updating workflow:', workflowError);
          throw new Error('Failed to update workflow for agent');
        }
      }
      
      // Collect training data
      const trainingData = {
        extractedLinks: extractedLinks,
        uploadedFiles: uploadedFiles
      }
      
      // Update the agent data
      const agentData = {
        // Basic info
        name: name,
        description: "Updated with Chatbot Automation",
        workflowId: currentWorkflowId,
        userId: "default-user",
        
        // Configuration
        chatbotName: name,
        systemPrompt: systemPrompt,
        temperature: temperature / 100,
        model: "llama-3.1",
        maxTokens: 2000,
        
        // Style
        topColor: topColor,
        accentColor: accentColor,
        backgroundColor: backgroundColor,
        avatarUrl: "",
        outsideButtonText: outsideButtonText,
        outsideButtonUrl: outsideButtonUrl,
        
        // Fine-tuning data
        extraConfig: {
          conversationStarters: conversationStarters,
          trainingData: trainingData
        }
      }

      console.log('Updating agent with data:', agentData);
      
      // Update the agent via API
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.status}`);
      }

      const result = await response.json();
      console.log('Agent updated successfully:', result);
      
      // Navigate to the home page after successful update
      router.push('/');
    } catch (error) {
      console.error('Error updating agent:', error);
      alert('Failed to update agent. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return
    
    setFileUploadStatus({ uploading: true, error: null })
    
    // Handle file upload logic
    console.log('File upload triggered')
    
    // Simulate successful upload
    setTimeout(() => {
      const filename = event.target.files?.[0]?.name || "uploaded-file.txt"
      setUploadedFiles([...uploadedFiles, filename])
      setFileUploadStatus({ uploading: false, error: null })
    }, 1000)
  }
  
  // Add conversation starter
  const addConversationStarter = () => {
    setConversationStarters([...conversationStarters, "New conversation starter"])
  }
  
  // Update conversation starter
  const updateConversationStarter = (index: number, value: string) => {
    const updated = [...conversationStarters]
    updated[index] = value
    setConversationStarters(updated)
  }
  
  // Remove conversation starter
  const removeConversationStarter = (index: number) => {
    const updated = [...conversationStarters]
    updated.splice(index, 1)
    setConversationStarters(updated)
  }
  
  // Handle web page link extraction
  const handleLinkExtraction = async () => {
    if (!linkUrl) return
    
    setExtractionStatus({ extracting: true, error: null })
    
    // Simulate successful extraction
    setTimeout(() => {
      if (linkUrl && !extractedLinks.includes(linkUrl)) {
        setExtractedLinks([...extractedLinks, linkUrl])
        setLinkUrl("")
      }
      setExtractionStatus({ extracting: false, error: null })
    }, 1000)
  }
  
  // Remove extracted link
  const removeExtractedLink = (index: number) => {
    const updated = [...extractedLinks]
    updated.splice(index, 1)
    setExtractedLinks(updated)
  }

  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-xl">Loading agent data...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Edit Agent: {name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button variant="outline" className="flex items-center" onClick={handleWorkflowClick}>
            <Settings className="mr-2 h-4 w-4" />
            Workflow
          </Button>
          <Button onClick={saveAgent} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Agent"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-medium">Agent configuration</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Agent Name
                </label>
                <Input
                  id="name"
                  placeholder="Enter agent name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="system-prompt" className="text-sm font-medium">
                  System Prompt
                </label>
                <Textarea
                  id="system-prompt"
                  placeholder="Enter system prompt for the AI"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="style">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="fine-tuning">Fine-tuning</TabsTrigger>
              <TabsTrigger value="conversation">Starters</TabsTrigger>
            </TabsList>
            <TabsContent value="style" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label id="top-color-label" className="text-sm font-medium">
                    Header Color
                  </label>
                  <ColorPalette
                    aria-labelledby="top-color-label"
                    value={topColor}
                    onValueChange={handleTopColorChange}
                    label="#FFFFFF"
                    aria-label="Header color value"
                  />
                </div>
                <div className="space-y-2">
                  <label id="accent-color-label" className="text-sm font-medium">
                    Accent Color
                  </label>
                  <ColorPalette
                    aria-labelledby="accent-color-label"
                    value={accentColor}
                    onValueChange={handleAccentColorChange}
                    label="#FFFFFF"
                    aria-label="Accent color value"
                  />
                </div>
                <div className="space-y-2">
                  <label id="background-color-label" className="text-sm font-medium">
                    Background Color
                  </label>
                  <ColorPalette
                    aria-labelledby="background-color-label"
                    value={backgroundColor}
                    onValueChange={handleBackgroundColorChange}
                    label="#FFFFFF"
                    aria-label="Background color value"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="button-text" className="text-sm font-medium">
                    Chat Button Text
                  </label>
                  <Input
                    id="button-text"
                    placeholder="Chat with our AI assistant!"
                    value={outsideButtonText}
                    onChange={(e) => setOutsideButtonText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="button-url" className="text-sm font-medium">
                    Chat Button URL (optional)
                  </label>
                  <Input
                    id="button-url"
                    placeholder="https://example.com/chat"
                    value={outsideButtonUrl}
                    onChange={(e) => setOutsideButtonUrl(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="fine-tuning" className="space-y-4 pt-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="temperature" className="text-sm font-medium">
                      Temperature: {temperature / 100}
                    </label>
                    <Slider
                      id="temperature"
                      min={0}
                      max={100}
                      step={1}
                      value={[temperature]}
                      onValueChange={(values) => setTemperature(values[0])}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>More Focused</span>
                      <span>More Creative</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Web Pages</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter URL to extract content"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      disabled={extractionStatus.extracting}
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleLinkExtraction}
                      disabled={!linkUrl || extractionStatus.extracting}
                    >
                      {extractionStatus.extracting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {extractedLinks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Extracted Links:</p>
                      {extractedLinks.map((link, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 text-sm border p-2 rounded-md">
                          <div className="flex items-center gap-2 truncate">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{link}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExtractedLink(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Upload Files</h3>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={fileUploadStatus.uploading}
                      className="file:bg-transparent file:border file:border-input file:rounded-md file:px-3 file:py-1 file:text-sm"
                    />
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Uploaded Files:</p>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 text-sm border p-2 rounded-md">
                          <div className="flex items-center gap-2 truncate">
                            <File className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{file}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = [...uploadedFiles]
                              updated.splice(index, 1)
                              setUploadedFiles(updated)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="conversation" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium">Conversation Starters</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addConversationStarter}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {conversationStarters.map((starter, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={starter}
                        onChange={(e) => updateConversationStarter(index, e.target.value)}
                        placeholder="Enter a conversation starter"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeConversationStarter(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {conversationStarters.length === 0 && (
                    <p className="text-sm text-muted-foreground">No conversation starters added yet.</p>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground mt-2">
                  <p>Conversation starters appear as buttons at the start of the chat.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <Card className="overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>See how your chatbot will appear</CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-[600px]">
            <ChatInterface
              topColor={topColor}
              accentColor={accentColor}
              backgroundColor={backgroundColor}
              name={name}
              conversationStarters={conversationStarters}
              systemPrompt={systemPrompt}
              preview={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
