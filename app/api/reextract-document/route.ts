import { NextResponse } from 'next/server';
import { extractFromFile } from '@/lib/services/content-extractor';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filePath, documentId } = body;
    
    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Extract content from the file
    let extractedContent;
    try {
      extractedContent = await extractFromFile(filePath);
      console.log(`Re-extracted content from ${path.basename(filePath)}, type: ${extractedContent.type}`);
    } catch (extractError) {
      console.error('Error re-extracting content:', extractError);
      
      // If extraction fails, provide basic information about the file
      const stats = await fs.promises.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      extractedContent = {
        content: `This file could not be fully extracted. File size: ${stats.size} bytes. Error: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
        type: ext === '.pdf' ? 'application/pdf' : 'application/octet-stream',
        filename: path.basename(filePath)
      };
    }

    // Return the extracted content
    return NextResponse.json({
      success: true,
      documentId,
      content: extractedContent.content,
      type: extractedContent.type,
      filename: extractedContent.filename,
      metadata: extractedContent.metadata || {}
    });
  } catch (error) {
    console.error('Error in re-extract document API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Add PUT method to update knowledge base documents
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { documentId, content } = body;
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Update the document in the knowledge base
    const knowledgeBaseDir = path.join(process.cwd(), 'knowledge-base');
    const filePath = path.join(knowledgeBaseDir, `${documentId}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Document not found in knowledge base' }, { status: 404 });
    }

    // Read the existing document
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const documentData = JSON.parse(fileContent);
    
    // Update the content
    documentData.content = content;
    
    // Write the updated document back to the file
    await fs.promises.writeFile(filePath, JSON.stringify(documentData, null, 2));

    return NextResponse.json({
      success: true,
      documentId,
      message: 'Document content updated successfully'
    });
  } catch (error) {
    console.error('Error updating document content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
