'use client';

import React, { useState, useRef, FormEvent } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Avatar } from './avatar';
import { v4 as uuidv4 } from 'uuid';

// Mock useChat hook to replicate the AI package functionality
function useChat({
  initialMessages = [],
  onFinish = () => {},
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Simulate a delay
    setTimeout(() => {
      // Add assistant response
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `This is a mock response to: "${input}"`,
        createdAt: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      onFinish(assistantMessage);
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

export function MockChat({
  accentColor = '#1d4ed8',
  backgroundColor = '#f9fafb',
  conversationStarters = [],
  onRemoveStarter = (_index: number) => {}
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
  
  const formRef = useRef<HTMLFormElement>(null);
  
  return (
    <div className="flex flex-col w-full h-full bg-gray-50" style={{ backgroundColor }}>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            <div
              className={`max-w-3/4 p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
              style={{
                backgroundColor: message.role === 'user' ? accentColor : 'white',
              }}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center mb-2">
                  <Avatar className="h-6 w-6 mr-2" />
                  <span className="font-semibold">Assistant</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
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
      
      <div className="border-t border-gray-200 p-4">
        <form ref={formRef} onSubmit={handleSubmit} className="flex space-x-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 min-h-10 max-h-40 resize-none"
          />
          <Button
            type="submit"
            style={{ backgroundColor: accentColor }}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
}
