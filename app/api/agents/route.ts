import { NextResponse } from "next/server"
import { query } from "@/lib/sevalla-db"

// GET /api/agents - List all agents
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Get user ID from query parameter or session (this should be properly authenticated)
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId") || "default-user"
    
    // First check if the agents table exists
    try {
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'agents'
        );`
      );
      
      const tableExists = tableCheck.rows[0].exists;
      
      if (!tableExists) {
        console.log("Creating agents table as it doesn't exist");
        // Create the agents table if it doesn't exist
        await query(`
          CREATE TABLE IF NOT EXISTS agents (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            workflow_id INTEGER,
            is_active BOOLEAN DEFAULT TRUE,
            avatar_url TEXT,
            chatbot_name VARCHAR(100) DEFAULT 'AI Assistant',
            system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
            top_color VARCHAR(20) DEFAULT '#1f2937',
            accent_color VARCHAR(20) DEFAULT '#3B82F6',
            background_color VARCHAR(20) DEFAULT '#F3F4F6',
            temperature DECIMAL(3,2) DEFAULT 0.7,
            model VARCHAR(100) DEFAULT 'gpt-4',
            max_tokens INTEGER DEFAULT 2000,
            extra_config JSONB
          );
        `);
        
        // Return empty array since we just created the table
        return NextResponse.json({ agents: [] });
      }
    } catch (tableError) {
      console.error("Error checking/creating agents table:", tableError);
      // Continue to try fetching agents even if table check fails
    }
    
    // Query agents from the database, sorted by most recent
    const result = await query(
      `SELECT id, name, description, created_at, updated_at, workflow_id, 
       is_active, avatar_url, chatbot_name, system_prompt,
       top_color, accent_color, background_color
       FROM agents WHERE created_by = $1 ORDER BY updated_at DESC`,
      [userId]
    )
    
    return NextResponse.json({ agents: result.rows })
  } catch (error) {
    console.error("Error fetching agents:", error)
    // Return empty array instead of error to avoid breaking the UI
    return NextResponse.json({ agents: [] })
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { 
      name, 
      description, 
      workflowId,
      userId = "default-user", 
      isActive = true,
      avatarUrl = "",
      // Chatbot configuration
      chatbotName = "AI Assistant",
      systemPrompt = "You are a helpful AI assistant.",
      // Style configuration
      topColor = "#1f2937",
      accentColor = "#3B82F6",
      backgroundColor = "#F3F4F6",
      // Fine tuning configuration
      temperature = 0.7,
      model = "gpt-4",
      maxTokens = 2000,
      extraConfig = {}
    } = await request.json()
    
    // Validate required fields
    if (!name || !workflowId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Check if the table exists and create it if not
    try {
      const tableCheckResult = await query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_name = 'agents'
         );`
      );
      
      const tableExists = tableCheckResult.rows[0].exists;
      
      if (!tableExists) {
        // Create the agents table if it doesn't exist
        await query(`
          CREATE TABLE IF NOT EXISTS agents (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            workflow_id INTEGER REFERENCES workflows(id),
            is_active BOOLEAN DEFAULT TRUE,
            avatar_url TEXT,
            chatbot_name VARCHAR(100) DEFAULT 'AI Assistant',
            system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
            top_color VARCHAR(20) DEFAULT '#1f2937',
            accent_color VARCHAR(20) DEFAULT '#3B82F6',
            background_color VARCHAR(20) DEFAULT '#F3F4F6',
            temperature DECIMAL(3,2) DEFAULT 0.7,
            model VARCHAR(100) DEFAULT 'gpt-4',
            max_tokens INTEGER DEFAULT 2000,
            extra_config JSONB
          );
        `);
      }
    } catch (error) {
      console.error("Error checking/creating agents table:", error);
    }
    
    // Insert agent into the database
    const result = await query(
      `INSERT INTO agents (
        name, 
        description, 
        created_by, 
        workflow_id,
        is_active,
        avatar_url,
        chatbot_name,
        system_prompt,
        top_color,
        accent_color,
        background_color,
        temperature,
        model,
        max_tokens,
        extra_config
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        name, 
        description || "", 
        userId,
        workflowId,
        isActive,
        avatarUrl,
        chatbotName,
        systemPrompt,
        topColor,
        accentColor,
        backgroundColor,
        temperature,
        model,
        maxTokens,
        JSON.stringify(extraConfig)
      ]
    )
    
    const agentId = result.rows[0].id
    
    return NextResponse.json({ 
      success: true, 
      message: "Agent created successfully", 
      agentId
    })
  } catch (error) {
    console.error("Error creating agent:", error)
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 })
  }
}

// PUT /api/agents/:id - Update an existing agent
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/agents/')[1]
    const agentId = id
    const { 
      name, 
      description, 
      workflowId,
      userId = "default-user", 
      isActive,
      avatarUrl,
      chatbotName,
      systemPrompt,
      topColor,
      accentColor,
      backgroundColor,
      temperature,
      model,
      maxTokens,
      extraConfig
    } = await request.json()
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Update agent in the database
    const result = await query(
      `UPDATE agents 
       SET name = $1, 
           description = $2, 
           workflow_id = $3,
           is_active = $4,
           avatar_url = $5,
           chatbot_name = $6,
           system_prompt = $7,
           top_color = $8,
           accent_color = $9,
           background_color = $10,
           temperature = $11,
           model = $12,
           max_tokens = $13,
           extra_config = $14,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15 AND created_by = $16
       RETURNING id`,
      [
        name, 
        description || "", 
        workflowId,
        isActive,
        avatarUrl,
        chatbotName,
        systemPrompt,
        topColor,
        accentColor,
        backgroundColor,
        temperature,
        model,
        maxTokens,
        JSON.stringify(extraConfig || {}),
        agentId,
        userId
      ]
    )
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Agent not found or you do not have permission to update it" }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Agent updated successfully" 
    })
  } catch (error) {
    console.error("Error updating agent:", error)
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 })
  }
}
