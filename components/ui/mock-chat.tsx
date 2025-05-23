/**
 * Mock implementation of the chat interface components
 * This replaces the AI package functionality with a simpler implementation
 * that doesn't have any complex dependencies
 */

"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
}

export function useChat({ initialMessages = [] }: { initialMessages?: Message[] } = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: input,
      role: 'user',
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Simulate AI response after a short delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: `This is a mock response to: "${input}"`,
        role: 'assistant',
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };
  
  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setInput
  };
}

export function ChatInterface({ 
  name = 'AI Assistant',
  systemPrompt = 'You are a helpful assistant.',
  topColor = '#3b82f6',
  accentColor = '#1d4ed8',
  backgroundColor = '#f9fafb',
  conversationStarters = [],
  onRemoveStarter = (index: number) => {}
}) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    initialMessages: [
      {
        id: 'welcome-message',
        role: 'assistant',
        content: 'Hello! How can I help you today?'
      }
    ]
  });
  
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor }}>
      <div className="p-4 border-b" style={{ backgroundColor: topColor, color: 'white' }}>
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="text-sm opacity-80">System: {systemPrompt}</p>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`mb-4 p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-gray-100 ml-auto max-w-[80%]' 
                : `mr-auto max-w-[80%]` 
            }`}
            style={{ 
              backgroundColor: message.role === 'user' ? '#e5e7eb' : topColor,
              color: message.role === 'user' ? '#1f2937' : 'white'
            }}
          >
            {message.content}
          </div>
        ))}
      </div>
      
      {conversationStarters.length > 0 && messages.length <= 2 && (
        <div className="p-4 flex flex-wrap gap-2">
          {conversationStarters.map((starter, index) => (
            <Button
              key={index}
              variant="outline"
              className="text-sm"
              style={{ borderColor: accentColor, color: accentColor }}
              onClick={() => {
                const form = document.querySelector('form');
                const input = document.querySelector('input');
                if (input) {
                  // @ts-ignore
                  input.value = starter;
                }
                if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
                onRemoveStarter(index);
              }}
            >
              {starter}
            </Button>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          placeholder="Type your message..."
          value={input}
          onChange={handleInputChange}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={isLoading}
          style={{ backgroundColor: accentColor }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
