"use client"

import { useState, useEffect } from "react"
import { X, RotateCcw, Send, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  content: string;
}

interface ChatInterfaceProps {
  name?: string
  systemPrompt?: string
  topColor?: string
  accentColor?: string
  backgroundColor?: string
  conversationStarters?: string[]
  preview?: boolean
  onRemoveStarter?: (index: number) => void
}

export function ChatInterface({
  name = "AI Assistant",
  systemPrompt = "You are a helpful AI assistant.",
  topColor = "#1f2937",
  accentColor = "#3B82F6",
  backgroundColor = "#F3F4F6",
  conversationStarters = [],
  onRemoveStarter
}: ChatInterfaceProps) {
  // We'll use a stable ID approach to avoid hydration mismatches
  const [uniqueId, setUniqueId] = useState("chat-default");
  
  // Set a client-side only unique ID after initial render to avoid hydration mismatch
  useEffect(() => {
    // Only run on client to avoid hydration mismatch
    setUniqueId(`chat-${Math.random().toString(36).substring(2, 9)}`);
  }, []);
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showStarterButtons, setShowStarterButtons] = useState(true) // Control visibility of all starter buttons

  // Initialize the chat messages when component loads or when system prompt changes
  useEffect(() => {
    resetConversation()
  }, [systemPrompt])
  
  // Reset starter buttons visibility when conversation is reset
  const resetStarterButtons = () => {
    setShowStarterButtons(true)
  }

  const resetConversation = () => {
    setMessages([
      {
        id: 1,
        role: "assistant",
        content: `👋 Hi, I'm ${name}! ${systemPrompt.includes("dog") ? "Woof woof! I'm a good boy! 🐕" : "I can help with information, answer questions, or just chat."}`,
      },
    ])
    setInput("")
    setIsLoading(false)
    resetStarterButtons() // Reset starter buttons visibility when conversation is reset
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: messages.length + 1,
      role: "user",
      content: input,
    };

    // Hide starter buttons after first user message
    setShowStarterButtons(false);
    
    // Add user message
    setMessages([...messages, userMessage]);
    
    // Clear input immediately for better UX
    setInput("");
    setIsLoading(true);

    try {
      // Use our API endpoint that connects to OpenRouter API using the key from .env
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
          })),
          systemPrompt: systemPrompt,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Add AI response from the API
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          role: "assistant",
          content: data.response || `I'm ${name}! How can I assist you today?`,
        },
      ]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      // Add fallback response in case of error
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          role: "assistant",
          content: `I'm sorry, I encountered an error. Please try again later.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border border-gray-200 bg-white">
      <div 
        className="flex items-center justify-between p-3 text-white"
        style={{ backgroundColor: topColor }}
      >
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center">
            <span className="text-gray-900">{name.charAt(0)}</span>
          </div>
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            className="p-1 rounded-md hover:bg-opacity-80"
            onClick={resetConversation}
            title="Reset conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button className="p-1 rounded-md hover:bg-opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ backgroundColor }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${
              message.role === "assistant"
                ? "rounded-lg p-3"
                : `text-white rounded-lg p-3 ml-auto`
            } max-w-[80%]`}
            style={{
              backgroundColor: message.role === "assistant" ? "white" : accentColor,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
            }}
          >
            {message.content}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-200">
        {/* Message Input Form with Conversation Starters above it */}
        {/* Conversation Starter Buttons - only show before first user message */}
        {showStarterButtons && messages.filter(m => m.role === "user").length === 0 && conversationStarters.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {conversationStarters.map((starter, index) => (
            <div key={index} className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1 px-2 h-auto flex items-center gap-1 bg-gray-50 hover:bg-gray-100"
                onClick={() => {
                // Send the message directly without setting input first
                const userMessage: ChatMessage = {
                  id: messages.length + 1,
                  role: "user",
                  content: starter,
                };
                
                // Hide all starter buttons after clicking any one of them
                setShowStarterButtons(false);
                
                // Add user message to chat
                setMessages([...messages, userMessage]);
                
                // Start loading state
                setIsLoading(true);
                
                // Call the API with the starter message
                fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messages: [...messages, userMessage].map(msg => ({
                      role: msg.role as 'system' | 'user' | 'assistant',
                      content: msg.content,
                    })),
                    systemPrompt: systemPrompt,
                    temperature: 0.7,
                  }),
                })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                  }
                  return response.json();
                })
                .then(data => {
                  // Add AI response
                  setMessages(prev => [
                    ...prev,
                    {
                      id: prev.length + 1,
                      role: "assistant",
                      content: data.response || `I'm ${name}! How can I assist you today?`,
                    },
                  ]);
                })
                .catch(error => {
                  console.error('Error fetching AI response:', error);
                  // Add fallback response in case of error
                  setMessages(prev => [
                    ...prev,
                    {
                      id: prev.length + 1,
                      role: "assistant",
                      content: `I'm sorry, I encountered an error. Please try again later.`,
                    },
                  ]);
                })
                .finally(() => {
                  setIsLoading(false);
                });
              }}
              disabled={isLoading}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              {starter}
              
            </Button>
            {/* Add X button for removing the conversation starter - Safari compatible version */}
            {onRemoveStarter && (
              <div 
                onClick={(e) => {
                  // Safari compatibility fix - use event capture and preventDefault
                  e.preventDefault();
                  e.stopPropagation();
                  // Add small delay to ensure event doesn't bubble to parent
                  setTimeout(() => onRemoveStarter(index), 10);
                  return false;
                }}
                className="ml-1 text-gray-400 hover:text-gray-700 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label="Remove conversation starter"
              >
                <X className="h-3 w-3" />
              </div>
            )}
          </div>
          ))}
        </div>
        )}
        
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="w-full">
          <div className="flex items-center">
            <label htmlFor={`chat-message-input-${uniqueId}`} className="sr-only">Type your message</label>
            <Input
              id={`chat-message-input-${uniqueId}`}
              name={`message-${uniqueId}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              aria-label="Chat message"
              disabled={isLoading}
            />
            <Button 
              type="submit"
              size="icon" 
              className="ml-2 hover:opacity-90" 
              aria-label="Send message"
              style={{ backgroundColor: accentColor }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
