"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Plus, MessageCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface Agent {
  id: number
  name: string
  description: string
  chatbot_name: string
  system_prompt: string
  top_color: string
  accent_color: string
  background_color: string
  created_at: string
  updated_at: string
}

export function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch agents when component mounts
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/agents?userId=default-user')
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
        
        const data = await response.json()
        setAgents(data.agents || [])
      } catch (err) {
        console.error('Error fetching agents:', err)
        setError('Failed to load agents')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAgents()
  }, []) // Fetch when component mounts

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-md font-medium">Current plan: Free</CardTitle>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Show menu</span>
              <ChevronDown className="h-4 w-4" />
              <span className="ml-2 text-sm">Monthly</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-blue-500">$0</p>
                <p className="text-sm text-gray-500">Current cost</p>
              </div>
              <div>
                <p className="text-2xl font-bold">0.00</p>
                <p className="text-sm text-gray-500">Usage</p>
              </div>
              <div>
                <p className="text-2xl font-bold">5,000</p>
                <p className="text-sm text-gray-500">Monthly limit</p>
              </div>
            </div>
            <Button className="mt-4 w-full sm:w-auto" variant="outline">
              Upgrade plan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-md font-medium">Operations</CardTitle>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Show menu</span>
              <ChevronDown className="h-4 w-4" />
              <span className="ml-2 text-sm">Monthly</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-gray-500">Current operations</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-500">Monthly</p>
                <p className="text-sm text-gray-500">Billing interval</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <div className="h-2 w-12 rounded-full bg-blue-200"></div>
              <div className="h-2 w-12 rounded-full bg-blue-200"></div>
              <div className="h-2 w-12 rounded-full bg-blue-200"></div>
              <div className="h-2 w-12 rounded-full bg-blue-200"></div>
              <div className="h-2 w-12 rounded-full bg-blue-200"></div>
              <div className="h-2 w-12 rounded-full bg-blue-200"></div>
              <div className="h-2 w-12 rounded-full bg-blue-200"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-md font-medium">Active agents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="ml-2 text-gray-500">Loading agents...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {agents.map(agent => (
                <div key={agent.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center mr-3" 
                        style={{ backgroundColor: agent.top_color || '#1f2937' }}
                      >
                        <span className="text-white">{agent.chatbot_name.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{agent.name}</h3>
                        <p className="text-sm text-gray-500">{new Date(agent.updated_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Link href={`/chat/${agent.id}`} passHref>
                        <Button size="sm" variant="outline" className="flex items-center">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </Link>
                      <Link href={`/new-agent?edit=true&agentId=${agent.id}`} passHref>
                        <Button size="sm" variant="ghost" className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Settings
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2">{agent.description || 'No description provided.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">There are no active agents in this organization.</p>
            </div>
          )}
          <div className="flex justify-end mb-4">
            <Link href="/new-agent">
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Create New Agent
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
