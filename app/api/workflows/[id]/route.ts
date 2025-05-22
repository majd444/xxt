import { NextResponse } from "next/server"
import { query } from "@/lib/sevalla-db"

// GET /api/workflows/:id - Get a specific workflow by ID
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/workflows/')[1]
    const workflowId = id
    
    // Query the database for the specific workflow
    const result = await query(
      `SELECT id, name, description, components, connections, 
       conversation_texts as "conversationTexts", 
       selected_tool_ids as "selectedToolIds", 
       created_by as "createdBy", 
       created_at as "createdAt", 
       chatbot_name as "chatbotName", 
       system_prompt as "systemPrompt",
       top_color as "topColor", 
       accent_color as "accentColor", 
       background_color as "backgroundColor",
       temperature, model, max_tokens as "maxTokens",
       extra_config as "extraConfig"
       FROM workflows 
       WHERE id = $1`,
      [workflowId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("Error fetching workflow:", error)
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 })
  }
}

// PUT /api/workflows/:id - Update a specific workflow by ID
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/workflows/')[1]
    const workflowId = id
    const data = await request.json()
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // Update the workflow in the database
    const result = await query(
      `UPDATE workflows 
       SET name = $1, 
           description = $2, 
           components = $3, 
           connections = $4,
           conversation_texts = $5,
           selected_tool_ids = $6,
           chatbot_name = $7,
           system_prompt = $8,
           top_color = $9,
           accent_color = $10,
           background_color = $11,
           temperature = $12,
           model = $13,
           max_tokens = $14,
           extra_config = $15
       WHERE id = $16
       RETURNING id`,
      [
        data.name,
        data.description || "",
        JSON.stringify(data.components || []),
        JSON.stringify(data.connections || []),
        JSON.stringify(data.conversationTexts || {}),
        JSON.stringify(data.selectedToolIds || {}),
        data.chatbotName || "AI Assistant",
        data.systemPrompt || "You are a helpful AI assistant.",
        data.topColor || "#1f2937",
        data.accentColor || "#3B82F6",
        data.backgroundColor || "#F3F4F6",
        data.temperature || 0.7,
        data.model || "gpt-4",
        data.maxTokens || 2000,
        JSON.stringify(data.extraConfig || {}),
        workflowId
      ]
    )
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, workflowId: result.rows[0].id })
  } catch (error) {
    console.error("Error updating workflow:", error)
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 })
  }
}

// PATCH /api/workflows/:id - Update specific fields of a workflow
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/workflows/')[1]
    const workflowId = id
    const data = await request.json()
    
    // Get current workflow data
    const current = await query(
      `SELECT * FROM workflows WHERE id = $1`,
      [workflowId]
    )
    
    if (current.rows.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    
    // Build update query based on provided fields
    let updateFields = []
    let queryParams = []
    let paramCount = 1
    
    // Only update the fields that are provided
    if (data.topColor !== undefined) {
      updateFields.push(`top_color = $${paramCount++}`)
      queryParams.push(data.topColor)
    }
    
    if (data.accentColor !== undefined) {
      updateFields.push(`accent_color = $${paramCount++}`)
      queryParams.push(data.accentColor)
    }
    
    if (data.backgroundColor !== undefined) {
      updateFields.push(`background_color = $${paramCount++}`)
      queryParams.push(data.backgroundColor)
    }
    
    // If no fields to update, return success
    if (updateFields.length === 0) {
      return NextResponse.json({ success: true, workflowId })
    }
    
    // Add workflowId to parameters
    queryParams.push(workflowId)
    
    // Execute update query
    const result = await query(
      `UPDATE workflows SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id`,
      queryParams
    )
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, workflowId: result.rows[0].id })
  } catch (error) {
    console.error("Error patching workflow:", error)
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 })
  }
}

// DELETE /api/workflows/:id - Delete a specific workflow by ID
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const id = request.url.split('/workflows/')[1]
    const workflowId = id
    
    // Delete the workflow from the database
    const result = await query(
      `DELETE FROM workflows WHERE id = $1 RETURNING id`,
      [workflowId]
    )
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting workflow:", error)
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 })
  }
}
