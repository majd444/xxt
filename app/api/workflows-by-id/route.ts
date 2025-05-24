import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/sevalla-db"

// GET /api/workflows-by-id?id=YOUR_WORKFLOW_ID - Get a specific workflow by ID
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')
    
    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 })
    }
    
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

// PUT /api/workflows-by-id?id=YOUR_WORKFLOW_ID - Update a specific workflow by ID
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')
    
    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 })
    }
    
    const data = await request.json()
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // Check if the workflow exists
    const checkResult = await query(
      "SELECT id FROM workflows WHERE id = $1",
      [workflowId]
    )
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    
    // Update the workflow
    const result = await query(
      `UPDATE workflows SET 
       name = $1, 
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
       RETURNING id, name`,
      [
        data.name,
        data.description || "",
        data.components || [],
        data.connections || [],
        data.conversationTexts || [],
        data.selectedToolIds || [],
        data.chatbotName || data.name,
        data.systemPrompt || "You are a helpful AI assistant.",
        data.topColor || "#1f2937",
        data.accentColor || "#3b82f6",
        data.backgroundColor || "#f9fafb",
        data.temperature || 0.7,
        data.model || "gpt-3.5-turbo",
        data.maxTokens || 1000,
        data.extraConfig || {},
        workflowId
      ]
    )
    
    return NextResponse.json({
      message: "Workflow updated successfully",
      workflow: {
        id: result.rows[0].id,
        name: result.rows[0].name
      }
    })
  } catch (error) {
    console.error("Error updating workflow:", error)
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 })
  }
}

// PATCH /api/workflows-by-id?id=YOUR_WORKFLOW_ID - Update specific fields of a workflow
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')
    
    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 })
    }
    
    const data = await request.json()
    
    // Check if the workflow exists
    const checkResult = await query(
      "SELECT id FROM workflows WHERE id = $1",
      [workflowId]
    )
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    
    // Build the update query dynamically based on what fields are provided
    let updateFields: string[] = []
    let queryParams: any[] = []
    let paramIndex: number = 1
    
    // Helper function to add fields to the update query
    const addField = (fieldName: string, jsonbField: boolean = false) => {
      if (data[fieldName] !== undefined) {
        updateFields.push(`${fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()}${jsonbField ? ' = $' + paramIndex + '::jsonb' : ' = $' + paramIndex}`)
        queryParams.push(data[fieldName])
        paramIndex++
      }
    }
    
    // Add all possible fields
    addField('name')
    addField('description')
    addField('components', true)
    addField('connections', true)
    addField('conversationTexts', true)
    addField('selectedToolIds', true)
    addField('chatbotName')
    addField('systemPrompt')
    addField('topColor')
    addField('accentColor')
    addField('backgroundColor')
    addField('temperature')
    addField('model')
    addField('maxTokens')
    addField('extraConfig', true)
    
    // Add the workflow ID as the last parameter
    queryParams.push(workflowId)
    
    if (updateFields.length === 0) {
      return NextResponse.json({ message: "No fields to update" })
    }
    
    // Execute the update query
    const updateQuery = `
      UPDATE workflows 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, name
    `
    
    const result = await query(updateQuery, queryParams)
    
    return NextResponse.json({
      message: "Workflow updated successfully",
      workflow: {
        id: result.rows[0].id,
        name: result.rows[0].name
      }
    })
  } catch (error) {
    console.error("Error updating workflow:", error)
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 })
  }
}

// DELETE /api/workflows-by-id?id=YOUR_WORKFLOW_ID - Delete a specific workflow by ID
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')
    
    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 })
    }
    
    // Delete the workflow
    const result = await query(
      "DELETE FROM workflows WHERE id = $1 RETURNING id, name",
      [workflowId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    
    return NextResponse.json({
      message: "Workflow deleted successfully",
      workflow: {
        id: result.rows[0].id,
        name: result.rows[0].name
      }
    })
  } catch (error) {
    console.error("Error deleting workflow:", error)
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 })
  }
}
