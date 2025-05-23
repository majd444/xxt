"use client"

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

/**
 * Mock implementation of the @ai-sdk/react useChat hook
 * This replaces the dependency with a local implementation to avoid build issues
 */

export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

type UseChatOptions = {
  api?: string
  id?: string
  initialMessages?: Message[]
  onFinish?: (message: Message) => void
  onError?: (error: Error) => void
}

export function useChat({
  initialMessages = [],
  _id = 'default',
  onFinish = () => {},
  _onError = () => {}
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement> | string) => {
    const value = typeof e === 'string' ? e : e.target.value
    setInput(value)
  }

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setInput('')

    // Simulate AI response after a delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `This is a mock response to: "${input}"`,
        createdAt: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
      onFinish(assistantMessage)
    }, 1000)
  }

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading
  }
}
