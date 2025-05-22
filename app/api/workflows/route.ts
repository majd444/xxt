import { NextResponse } from "next/server"
import { query } from "@/lib/sevalla-db"

// GET /api/workflows - List all workflows
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Get user ID from query parameter or session (this should be properly authenticated)
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId") || "default-user"
    
    // Query workflows from the database, sorted by most recent
    const result = await query(
      'SELECT id, name, description, created_at, updated_at FROM workflows WHERE created_by = $1 ORDER BY updated_at DESC',
      [userId]
    )
    
    return NextResponse.json({ workflows: result.rows })
  } catch (error) {
    console.error("Error fetching workflows:", error)
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 })
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { 
      name, 
      description, 
      components, 
      connections, 
      conversationTexts, 
      selectedToolIds, 
      userId = "default-user", 
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
    
    // Check if the database has the new schema or not
    let hasNewSchema = false;
    try {
      // This is a safe query to check if the column exists
      const schemaCheckResult = await query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name='workflows' AND column_name='chatbot_name'`
      );
      hasNewSchema = schemaCheckResult.rows.length > 0;
    } catch (error) {
      console.log('Schema check failed, assuming old schema:', error);
      hasNewSchema = false;
    }
    
    // Validate required fields
    if (!name || !components || !connections) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Insert workflow into the database based on schema availability
    let result;
    
    if (hasNewSchema) {
      // Use new schema with individual columns
      result = await query(
        `INSERT INTO workflows (
          name, 
          description, 
          created_by, 
          components, 
          connections, 
          conversation_texts, 
          selected_tool_ids,
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING id`,
        [
          name, 
          description || "", 
          userId, 
          JSON.stringify(components), 
          JSON.stringify(connections),
          conversationTexts ? JSON.stringify(conversationTexts) : null,
          selectedToolIds ? JSON.stringify(selectedToolIds) : null,
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
      );
    } else {
      // Use old schema - store all configuration in the connections JSON field (as a workaround)
      // This will ensure all settings are saved even with the old schema
      const extraConfigData = {
        ...extraConfig,
        chatbotName,
        systemPrompt,
        topColor,
        accentColor,
        backgroundColor,
        temperature,
        model,
        maxTokens
      };
      
      // Add the configuration to the connections object as a special key
      const connectionsWithConfig = {
        ...connections,
        _chatbotConfig: extraConfigData
      };
      
      result = await query(
        `INSERT INTO workflows (name, description, created_by, components, connections, conversation_texts, selected_tool_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          name, 
          description || "", 
          userId, 
          JSON.stringify(components), 
          JSON.stringify(connectionsWithConfig),
          conversationTexts ? JSON.stringify(conversationTexts) : null,
          selectedToolIds ? JSON.stringify(selectedToolIds) : null
        ]
      );
    }
    
    const workflowId = result.rows[0].id
    
    return NextResponse.json({ 
      success: true, 
      message: "Workflow created successfully", 
      workflowId
    })
  } catch (error) {
    console.error("Error creating workflow:", error)
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 })
  }
}

// PUT /api/workflows/:id - Update an existing workflow
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/workflows/')[1]
    const workflowId = id
    const { name, description, components, connections, conversationTexts, selectedToolIds, userId = "default-user" } = await request.json()
    
    // Validate required fields
    if (!name || !components || !connections) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Update workflow in the database
    const result = await query(
      `UPDATE workflows 
       SET name = $1, description = $2, components = $3, connections = $4,
           conversation_texts = $5, selected_tool_ids = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND created_by = $8
       RETURNING id`,
      [
        name, 
        description || "", 
        JSON.stringify(components), 
        JSON.stringify(connections),
        conversationTexts ? JSON.stringify(conversationTexts) : null,
        selectedToolIds ? JSON.stringify(selectedToolIds) : null,
        workflowId,
        userId
      ]
    )
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Workflow not found or you do not have permission to update it" }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Workflow updated successfully" 
    })
  } catch (error) {
    console.error("Error updating workflow:", error)
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 })
  }
}
