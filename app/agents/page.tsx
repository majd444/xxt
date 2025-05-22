"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Agent {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
  is_active: boolean
  chatbot_name: string
  avatar_url?: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/agents')
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch agents')
        }
        
        setAgents(data.agents || [])
      } catch (error) {
        console.error('Error fetching agents:', error)
        setError(typeof error === 'string' ? error : (error as Error).message || 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">AI Agents</h1>
        <Link href="/workflow/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create a new agent
          </Button>
        </Link>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">There are no active agents in this organization.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                <div 
                  className="h-3" 
                  style={{ backgroundColor: agent.avatar_url || '#3B82F6' }}
                />
                <div className="p-4 flex-1">
                  <h3 className="text-lg font-medium mb-1">{agent.name}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{agent.description || 'No description'}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>Created {new Date(agent.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
                  <Link href={`/agents/${agent.id}`}>
                    <Button variant="outline" size="sm">Configure</Button>
                  </Link>
                  <Link href={`/chat/${agent.id}`}>
                    <Button size="sm">Chat</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Link href="/workflow/new" className="mt-8 block">
          <Button className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Create a new agent
          </Button>
        </Link>
      </div>
    </div>
  )
}
