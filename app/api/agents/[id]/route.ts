import { NextResponse } from "next/server"
import { query } from "@/lib/sevalla-db"

// GET /api/agents/:id - Get a specific agent by ID
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/agents/')[1]
    console.log(`Fetching agent with ID: ${id}`)
    const agentId = id
    
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
      console.error("Error checking/creating agents table:", tableError)
      // Continue to try fetching the agent even if table check fails
    }
    
    // Check and alter table to add missing columns if needed
    try {
      console.log('Checking for missing columns in agents table')
      // First check if outside_button_text column exists
      const columnCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'agents' AND column_name = 'outside_button_text'
        )`
      )
      
      const outsideButtonTextExists = columnCheck.rows[0].exists
      console.log(`outside_button_text column exists: ${outsideButtonTextExists}`)
      
      if (!outsideButtonTextExists) {
        console.log('Adding missing columns to agents table')
        // Add missing columns to the table
        await query(`
          ALTER TABLE agents 
          ADD COLUMN IF NOT EXISTS outside_button_text TEXT,
          ADD COLUMN IF NOT EXISTS outside_button_url TEXT,
          ADD COLUMN IF NOT EXISTS model VARCHAR(50),
          ADD COLUMN IF NOT EXISTS max_tokens INTEGER
        `)
        console.log('Added missing columns to agents table')
      }
    } catch (columnError) {
      console.error('Error checking/adding columns:', columnError)
      // Continue even if column check fails - we'll handle missing columns in the query
    }
    
    // Query the database for the specific agent with fallbacks for missing columns
    console.log(`Executing query to fetch agent with ID: ${agentId}`)
    
    // Modified query with COALESCE to handle possibly missing columns
    const result = await query(
      `SELECT id, name, COALESCE(description, '') as description, 
       COALESCE(workflow_id, 0) as "workflowId", 
       COALESCE(chatbot_name, name) as "chatbotName", 
       COALESCE(system_prompt, 'You are a helpful AI assistant.') as "systemPrompt",
       COALESCE(top_color, '#1f2937') as "topColor", 
       COALESCE(accent_color, '#3B82F6') as "accentColor", 
       COALESCE(background_color, '#F3F4F6') as "backgroundColor",
       COALESCE(avatar_url, '') as "avatarUrl",
       COALESCE(temperature, 0.7) as temperature, 
       COALESCE(extra_config, '{}'::jsonb) as "extraConfig",
       COALESCE(created_by, 'default-user') as "createdBy", 
       created_at as "createdAt"
       FROM agents 
       WHERE id = $1`,
      [agentId]
    )
    
    console.log(`Query result rows: ${result.rows.length}`)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }
    
    const agent = result.rows[0]
    console.log(`Found agent: ${agent.name}`)
    
    // Handle extraConfig parsing safely
    try {
      // PostgreSQL should return JSONB fields as parsed objects already
      // But handle the case where it might be a string for compatibility
      if (agent.extraConfig && typeof agent.extraConfig === 'string') {
        console.log('Parsing extraConfig from string')
        agent.extraConfig = JSON.parse(agent.extraConfig)
      } else if (!agent.extraConfig) {
        // Ensure extraConfig is at least an empty object if null/undefined
        console.log('Initializing empty extraConfig')
        agent.extraConfig = {}
      }
      
      // Ensure conversationStarters exists in extraConfig
      if (!agent.extraConfig.conversationStarters) {
        agent.extraConfig.conversationStarters = []
      }
      
      console.log('extraConfig processed successfully')
    } catch (jsonError) {
      console.error('Error processing agent extraConfig:', jsonError)
      // Provide a safe fallback structure
      agent.extraConfig = {
        conversationStarters: [],
        trainingData: {
          extractedLinks: [],
          uploadedFiles: []
        }
      }
    }
    
    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Error fetching agent:", error)
    // Include more detailed error information in development
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json({ 
      error: "Failed to fetch agent",
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}

// PUT /api/agents/:id - Update a specific agent by ID
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/agents/')[1]
    const agentId = id
    console.log(`Updating agent with ID: ${agentId}`)
    
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
      console.error("Error checking/creating agents table:", tableError)
      // Continue to try updating the agent even if table check fails
    }
    
    // Parse request body
    const data = await request.json()
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // Check if agent exists before updating
    const checkResult = await query(
      `SELECT id FROM agents WHERE id = $1`,
      [agentId]
    )
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }
    
    // Prepare extraConfig as JSONB
    let extraConfigJson
    try {
      // Ensure conversationStarters exists
      if (!data.extraConfig) {
        data.extraConfig = {}
      }
      
      if (!data.extraConfig.conversationStarters) {
        data.extraConfig.conversationStarters = []
      }
      
      // If we have a trainingData object, make sure it has the expected structure
      if (!data.extraConfig.trainingData) {
        data.extraConfig.trainingData = {
          extractedLinks: [],
          uploadedFiles: []
        }
      }
      
      extraConfigJson = JSON.stringify(data.extraConfig)
      console.log('Processed extraConfig successfully')
    } catch (jsonError) {
      console.error('Error processing extra config:', jsonError)
      return NextResponse.json({ 
        error: "Invalid extraConfig format",
        details: jsonError instanceof Error ? jsonError.message : String(jsonError)
      }, { status: 400 })
    }
    
    console.log(`Executing update query for agent ${agentId}`)
    // Update the agent in the database
    const result = await query(
      `UPDATE agents 
       SET name = $1, 
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
           extra_config = $15::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING id`,
      [
        data.name,
        data.description || "",
        data.workflowId,
        data.chatbotName || data.name,
        data.systemPrompt || "You are a helpful AI assistant.",
        data.topColor || "#1f2937",
        data.accentColor || "#3B82F6",
        data.backgroundColor || "#F3F4F6",
        data.avatarUrl || "",
        data.outsideButtonText || "Chat with our AI assistant!",
        data.outsideButtonUrl || "",
        data.temperature || 0.7,
        data.model || "llama-3.1",
        data.maxTokens || 2000,
        extraConfigJson,
        agentId
      ]
    )
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Agent not found or update failed" }, { status: 404 })
    }
    
    console.log(`Agent ${agentId} updated successfully`)
    return NextResponse.json({ success: true, agentId: result.rows[0].id })
  } catch (error) {
    console.error("Error updating agent:", error)
    // Include more detailed error information in development
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json({ 
      error: "Failed to update agent",
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}

// DELETE /api/agents/:id - Delete a specific agent by ID
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/agents/')[1]
    const agentId = id
    
    // Delete the agent from the database
    const result = await query(
      `DELETE FROM agents WHERE id = $1 RETURNING id`,
      [agentId]
    )
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 })
  }
}
