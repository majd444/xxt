import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/sevalla-db"

// GET /api/agents-by-id?id=YOUR_AGENT_ID - Get a specific agent by ID
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('id')
    
    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }
    
    console.log(`Fetching agent with ID: ${agentId}`)
    
    // First check if the agents table exists
    try {
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'agents'
        )`
      )
      
      const tableExists = tableCheck.rows[0].exists
      console.log(`Agents table exists: ${tableExists}`)
      
      if (!tableExists) {
        console.log("Creating agents table as it doesn't exist")
        // Create the agents table if it doesn't exist
        await query(`
          CREATE TABLE IF NOT EXISTS agents (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            workflow_id INTEGER,
            chatbot_name VARCHAR(255),
            system_prompt TEXT,
            top_color VARCHAR(50),
            accent_color VARCHAR(50),
            background_color VARCHAR(50),
            avatar_url TEXT,
            outside_button_text TEXT,
            outside_button_url TEXT,
            temperature FLOAT,
            model VARCHAR(50),
            max_tokens INTEGER,
            extra_config JSONB,
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `)
        return NextResponse.json({ error: "Agent not found - table was just created" }, { status: 404 })
      }
    } catch (tableError) {
      console.error("Error checking for agents table:", tableError)
    }
    
    // Query the database for the specific agent
    const result = await query(
      `SELECT id, name, description, workflow_id as "workflowId",
       chatbot_name as "chatbotName", system_prompt as "systemPrompt",
       top_color as "topColor", accent_color as "accentColor", 
       background_color as "backgroundColor",
       avatar_url as "avatarUrl",
       outside_button_text as "outsideButtonText",
       outside_button_url as "outsideButtonUrl",
       temperature, model, max_tokens as "maxTokens",
       extra_config as "extraConfig",
       created_by as "createdBy", 
       created_at as "createdAt"
       FROM agents 
       WHERE id = $1`,
      [agentId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("Error fetching agent:", error)
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 })
  }
}

// PUT /api/agents-by-id?id=YOUR_AGENT_ID - Update a specific agent by ID
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('id')
    
    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }
    
    const data = await request.json()
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // Update the agent in the database
    const result = await query(
      `UPDATE agents SET 
       name = $1, 
       description = $2,
       workflow_id = $3,
       chatbot_name = $4,
       system_prompt = $5,
       top_color = $6,
       accent_color = $7,
       background_color = $8,
       avatar_url = $9,
       outside_button_text = $10,
       outside_button_url = $11,
       temperature = $12,
       model = $13,
       max_tokens = $14,
       extra_config = $15,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING *`,
      [
        data.name,
        data.description || "",
        data.workflowId || null,
        data.chatbotName || data.name,
        data.systemPrompt || "You are a helpful AI assistant.",
        data.topColor || "#1f2937",
        data.accentColor || "#3b82f6",
        data.backgroundColor || "#f9fafb",
        data.avatarUrl || "",
        data.outsideButtonText || "",
        data.outsideButtonUrl || "",
        data.temperature || 0.7,
        data.model || "gpt-3.5-turbo",
        data.maxTokens || 1000,
        data.extraConfig || {},
        agentId
      ]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found or update failed" }, { status: 404 })
    }
    
    return NextResponse.json({
      message: "Agent updated successfully",
      agent: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        updatedAt: result.rows[0].updated_at
      }
    })
  } catch (error) {
    console.error("Error updating agent:", error)
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 })
  }
}

// DELETE /api/agents-by-id?id=YOUR_AGENT_ID - Delete a specific agent by ID
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('id')
    
    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }
    
    // Delete the agent from the database
    const result = await query(
      `DELETE FROM agents WHERE id = $1 RETURNING id, name`,
      [agentId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }
    
    return NextResponse.json({
      message: "Agent deleted successfully",
      agent: {
        id: result.rows[0].id,
        name: result.rows[0].name
      }
    })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 })
  }
}
