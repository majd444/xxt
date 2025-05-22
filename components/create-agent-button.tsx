"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

export function CreateAgentButton() {
  const router = useRouter()

  const handleClick = () => {
    // Redirect to the new agent creation page
    router.push("/new-agent")
  }

  return (
    <Button onClick={handleClick} className="flex items-center">
      <Plus className="h-4 w-4 mr-2" />
      Create New Agent
    </Button>
  )
}
