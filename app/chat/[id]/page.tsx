"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Paperclip, Bot } from "lucide-react"

// Direct inline type for Next.js 15 compatibility

export default function ChatPage({ params }: { params: { id: string } }) {
  const chatId = params?.id || 'default';
  
  // Self-contained chat implementation
  const [messages, setMessages] = useState([
    {
      id: "welcome-message",
      role: "assistant",
      content: "👋 Hi, I'm AI Assistant! How can I help you today?",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | string) => {
    const value = typeof e === 'string' ? e : e.target.value;
    setInput(value);
  };

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    // Simulate AI response after a delay
    setTimeout(() => {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `This is a mock response to: "${input}"`
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-medium">AI Assistant</h2>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-gray-100">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce"></div>
                    <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce delay-100"></div>
                    <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-white">
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <Button type="button" size="icon" variant="outline" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input value={input} onChange={handleInputChange} placeholder="Type your message..." className="flex-1" />
              <Button type="submit" size="icon" className="shrink-0 bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
