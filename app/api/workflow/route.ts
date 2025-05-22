import { NextRequest, NextResponse } from 'next/server';
import workflowService from '../../../lib/services/workflow';
import { query } from '../../../lib/db';

/**
 * Execute a workflow
 * 
 * POST /api/workflow/execute
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, triggerData } = body;
    
    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }
    
    // Execute workflow
    const result = await workflowService.executeWorkflow(workflowId, triggerData || {});
    
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error executing workflow:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}

/**
 * Get a list of available workflows for the user
 * 
 * GET /api/workflow
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from auth token or query param
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get workflows from database
    const workflowsResult = await query(
      'SELECT id, name, description, trigger, created_at FROM workflows WHERE created_by = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return NextResponse.json({ workflows: workflowsResult.rows });
  } catch (error: unknown) {
    console.error('Error getting workflows:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}
