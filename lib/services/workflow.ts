import axios from 'axios';
import { query } from '../db';
import botpressService from './botpress';
import emailService from './email';
import calendarService from './calendar';
import smsService from './sms';
import llmService, { ChatMessage } from './llm';
import contentExtractorService from './content-extractor';

// Workflow step types
export enum StepType {
  EXTRACT_URL_CONTENT = 'extract_url_content',
  EXTRACT_FILE_CONTENT = 'extract_file_content',
  SEND_EMAIL = 'send_email',
  CREATE_EVENT = 'create_event',
  SEND_SMS = 'send_sms',
  CHATBOT_RESPONSE = 'chatbot_response',
  WAIT = 'wait',
  CONDITION = 'condition',
  EXTERNAL_API = 'external_api',
}

// Interface for workflow definition
interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: {
    type: string;
    config: any;
  };
  steps: Array<{
    id: string;
    name: string;
    type: StepType;
    config: any;
    next?: string | null;
    nextIfTrue?: string | null;
    nextIfFalse?: string | null;
  }>;
  createdBy: number; // User ID
}

// Interface for workflow execution context
interface WorkflowContext {
  workflowId: string;
  executionId: string;
  trigger: any;
  data: Record<string, any>;
  currentStepId: string | null;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

/**
 * Execute a workflow step
 * @param workflow The workflow definition
 * @param context Current workflow execution context
 * @param stepId ID of the step to execute
 */
async function executeStep(workflow: Workflow, context: WorkflowContext, stepId: string): Promise<WorkflowContext> {
  try {
    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step "${stepId}" not found in workflow`);
    }
    
    // Update context with current step
    context.currentStepId = stepId;
    
    // Execute step based on type
    switch (step.type) {
      case StepType.EXTRACT_URL_CONTENT: {
        const url = resolveTemplate(step.config.url, context.data);
        const content = await contentExtractorService.extractFromUrl(url);
        context.data[step.config.outputKey || 'urlContent'] = content;
        break;
      }
      
      case StepType.EXTRACT_FILE_CONTENT: {
        const filePath = resolveTemplate(step.config.filePath, context.data);
        const content = await contentExtractorService.extractFromFile(filePath);
        context.data[step.config.outputKey || 'fileContent'] = content;
        break;
      }
      
      case StepType.SEND_EMAIL: {
        const userId = context.data.userId || workflow.createdBy;
        const emailOptions = {
          to: resolveTemplate(step.config.to, context.data),
          subject: resolveTemplate(step.config.subject, context.data),
          text: step.config.text ? resolveTemplate(step.config.text, context.data) : undefined,
          html: step.config.html ? resolveTemplate(step.config.html, context.data) : undefined,
        };
        
        const result = await emailService.sendMicrosoftEmail(userId, emailOptions);
        context.data[step.config.outputKey || 'emailResult'] = result;
        break;
      }
      
      case StepType.CREATE_EVENT: {
        const userId = context.data.userId || workflow.createdBy;
        const provider = step.config.provider || 'google';
        
        const eventDetails = {
          summary: resolveTemplate(step.config.summary, context.data),
          location: step.config.location ? resolveTemplate(step.config.location, context.data) : undefined,
          description: step.config.description ? resolveTemplate(step.config.description, context.data) : undefined,
          start: {
            dateTime: resolveTemplate(step.config.startDateTime, context.data),
            timeZone: step.config.timeZone || 'UTC',
          },
          end: {
            dateTime: resolveTemplate(step.config.endDateTime, context.data),
            timeZone: step.config.timeZone || 'UTC',
          },
          attendees: step.config.attendees?.map((attendee: any) => ({
            email: resolveTemplate(attendee.email, context.data),
            name: attendee.name ? resolveTemplate(attendee.name, context.data) : undefined,
          })),
        };
        
        let result;
        if (provider === 'google') {
          result = await calendarService.createGoogleEvent(userId, eventDetails);
        } else {
          result = await calendarService.createMicrosoftEvent(userId, eventDetails);
        }
        
        context.data[step.config.outputKey || 'eventResult'] = result;
        break;
      }
      
      case StepType.SEND_SMS: {
        const smsOptions = {
          to: resolveTemplate(step.config.to, context.data),
          message: resolveTemplate(step.config.message, context.data),
          from: step.config.from ? resolveTemplate(step.config.from, context.data) : undefined,
        };
        
        const result = await smsService.sendSms(smsOptions);
        context.data[step.config.outputKey || 'smsResult'] = result;
        break;
      }
      
      case StepType.CHATBOT_RESPONSE: {
        const userMessage = resolveTemplate(step.config.userMessage, context.data);
        const conversationId = context.data.conversationId || step.config.conversationId;
        
        if (step.config.provider === 'botpress' && conversationId) {
          // Use Botpress for chatbot response
          const botResponse = await botpressService.sendMessage(conversationId, userMessage);
          context.data[step.config.outputKey || 'botResponse'] = botResponse;
        } else {
          // Use LLM service for chatbot response
          const messages: ChatMessage[] = [
            { role: 'system', content: step.config.systemPrompt || 'You are a helpful assistant.' } as ChatMessage,
            { role: 'user', content: userMessage } as ChatMessage
          ];
          
          const llmResponse = await llmService.generateChatCompletion({
            messages,
            model: step.config.model,
            temperature: step.config.temperature,
            userId: context.data.userId?.toString(),
            conversationId: context.data.conversationId
          });
          
          context.data[step.config.outputKey || 'botResponse'] = llmResponse.response;
        }
        break;
      }
      
      case StepType.WAIT: {
        const duration = parseInt(resolveTemplate(step.config.duration, context.data));
        await new Promise(resolve => setTimeout(resolve, duration));
        break;
      }
      
      case StepType.CONDITION: {
        // Evaluate condition to determine next step
        const conditionResult = evaluateCondition(step.config.condition, context.data);
        
        // Store the condition result
        context.data[step.config.outputKey || 'conditionResult'] = conditionResult;
        
        // Set the next step based on condition
        if (conditionResult) {
          if (step.nextIfTrue) {
            return executeStep(workflow, context, step.nextIfTrue);
          }
        } else {
          if (step.nextIfFalse) {
            return executeStep(workflow, context, step.nextIfFalse);
          }
        }
        break;
      }
      
      case StepType.EXTERNAL_API: {
        const method = step.config.method || 'GET';
        const url = resolveTemplate(step.config.url, context.data);
        
        // Prepare headers
        const headers: Record<string, string> = {};
        if (step.config.headers) {
          for (const key in step.config.headers) {
            headers[key] = resolveTemplate(step.config.headers[key], context.data);
          }
        }
        
        // Prepare request body
        let data = null;
        if (step.config.body) {
          data = JSON.parse(resolveTemplate(JSON.stringify(step.config.body), context.data));
        }
        
        // Make API request
        const response = await axios({
          method,
          url,
          headers,
          data,
        });
        
        context.data[step.config.outputKey || 'apiResponse'] = response.data;
        break;
      }
      
      default:
        throw new Error(`Unsupported step type: ${step.type}`);
    }
    
    // Log step execution
    await logStepExecution(context.executionId, stepId, 'completed');
    
    // Determine next step
    if (step.next) {
      return executeStep(workflow, context, step.next);
    }
    
    // If no next step, workflow is complete
    context.status = 'completed';
    context.completedAt = new Date();
    
    // Log workflow completion
    await updateWorkflowExecution(context);
    
    return context;
  } catch (error: unknown) {
    console.error(`Error executing workflow step "${stepId}":`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Log step failure
    await logStepExecution(context.executionId, stepId, 'failed', errorMessage);
    
    // Update workflow context with error
    context.status = 'failed';
    context.error = errorMessage;
    
    // Log workflow failure
    await updateWorkflowExecution(context);
    
    return context;
  }
}

/**
 * Execute a workflow from start to finish
 * @param workflowId The ID of the workflow to execute
 * @param triggerData Data from the trigger event
 */
export async function executeWorkflow(workflowId: string, triggerData: any = {}) {
  try {
    // Get workflow definition from database
    const workflowResult = await query(
      'SELECT * FROM workflows WHERE id = $1',
      [workflowId]
    );
    
    if (workflowResult.rows.length === 0) {
      throw new Error(`Workflow with ID "${workflowId}" not found`);
    }
    
    const workflow = workflowResult.rows[0];
    
    // Create execution record
    const executionResult = await query(
      `INSERT INTO workflow_executions (workflow_id, status, started_at, trigger_data)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
       RETURNING id`,
      [workflowId, 'running', JSON.stringify(triggerData)]
    );
    
    const executionId = executionResult.rows[0].id;
    
    // Initialize workflow context
    const context: WorkflowContext = {
      workflowId,
      executionId,
      trigger: triggerData,
      data: { ...triggerData },
      currentStepId: null,
      startedAt: new Date(),
      status: 'running',
    };
    
    // Find the first step
    const firstStep = workflow.steps[0];
    if (!firstStep) {
      throw new Error('Workflow has no steps');
    }
    
    // Execute workflow starting from the first step
    return await executeStep(workflow, context, firstStep.id);
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
}

/**
 * Resolve variables in a template string using context data
 * @param template Template string with variables in the format ${variableName}
 * @param data Context data object containing variable values
 */
function resolveTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\${([\w.]+)}/g, (match, key) => {
    const keys = key.split('.');
    let value = data;
    
    for (const k of keys) {
      if (value === undefined || value === null) {
        return match; // Return the original placeholder if value is undefined or null
      }
      value = value[k];
    }
    
    return value !== undefined && value !== null ? value.toString() : match;
  });
}

/**
 * Evaluate a condition expression
 * @param condition Condition expression
 * @param data Context data
 */
function evaluateCondition(condition: string, data: Record<string, any>): boolean {
  try {
    // Replace variables in the condition with their values
    const resolvedCondition = resolveTemplate(condition, data);
    
    // Use Function constructor to evaluate the condition
    // Note: This is potentially unsafe for untrusted inputs
    // In a production system, use a more secure evaluation method
    const evaluator = new Function('data', `return ${resolvedCondition};`);
    return !!evaluator(data);
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

/**
 * Log step execution in the database
 * @param executionId Workflow execution ID
 * @param stepId Step ID
 * @param status Execution status
 * @param error Error message (if any)
 */
async function logStepExecution(
  executionId: string,
  stepId: string,
  status: 'running' | 'completed' | 'failed',
  error?: string
) {
  try {
    await query(
      `INSERT INTO workflow_step_executions (execution_id, step_id, status, error, timestamp)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [executionId, stepId, status, error]
    );
  } catch (dbError) {
    console.error('Error logging step execution:', dbError);
    // Continue despite logging error
  }
}

/**
 * Update workflow execution status in the database
 * @param context Workflow execution context
 */
async function updateWorkflowExecution(context: WorkflowContext) {
  try {
    await query(
      `UPDATE workflow_executions
       SET status = $1, completed_at = $2, result_data = $3, error = $4
       WHERE id = $5`,
      [
        context.status,
        context.completedAt || null,
        JSON.stringify(context.data),
        context.error || null,
        context.executionId,
      ]
    );
  } catch (dbError) {
    console.error('Error updating workflow execution:', dbError);
    // Continue despite logging error
  }
}

export default {
  StepType,
  executeWorkflow,
};
