"use client"

const { useState } = require('react');

// Mock implementation of useChat hook
function useChat({
  initialMessages = [],
  id = 'default',
  onFinish = () => {},
  onError = () => {}
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const value = typeof e === 'string' ? e : e.target.value;
    setInput(value);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    // Simulate AI response after a delay
    setTimeout(() => {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `This is a mock response to: "${input}"`,
        createdAt: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      onFinish(assistantMessage);
    }, 1000);
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading
  };
}

module.exports = {
  useChat
};
