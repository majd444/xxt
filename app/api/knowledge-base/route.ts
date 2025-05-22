import { NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import * as fs from 'fs';

// Ensure knowledge base directory exists
const knowledgeBaseDir = join(process.cwd(), 'knowledge-base');
if (!fs.existsSync(knowledgeBaseDir)) {
  fs.mkdirSync(knowledgeBaseDir, { recursive: true });
}

// GET: Retrieve all documents in the knowledge base
export async function GET() {
  try {
    // Read all files in the knowledge base directory
    const files = fs.readdirSync(knowledgeBaseDir);
    const documents = [];

    for (const file of files) {
      const filePath = join(knowledgeBaseDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        const content = await readFile(filePath, 'utf-8');
        const metadata = JSON.parse(content);
        
        documents.push({
          id: file.replace('.json', ''),
          filename: metadata.filename,
          title: metadata.title || metadata.filename,
          type: metadata.type,
          addedAt: metadata.addedAt,
          size: stats.size
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      documents 
    });
  } catch (error) {
    console.error('Error retrieving knowledge base:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve knowledge base' },
      { status: 500 }
    );
  }
}

// POST: Add a document to the knowledge base
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, content, filename, type, title, metadata } = body;
    
    if (!documentId || !content) {
      return NextResponse.json({ error: 'Document ID and content are required' }, { status: 400 });
    }

    // Create a metadata file with document information
    const documentData = {
      documentId,
      filename,
      title: title || filename,
      type,
      content,
      metadata: metadata || {},
      addedAt: new Date().toISOString()
    };

    // Save to knowledge base
    const filePath = join(knowledgeBaseDir, `${documentId}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(documentData, null, 2));

    return NextResponse.json({
      success: true,
      documentId,
      message: 'Document added to knowledge base'
    });
  } catch (error) {
    console.error('Error adding to knowledge base:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add document to knowledge base' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a document from the knowledge base
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const filePath = join(knowledgeBaseDir, `${documentId}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete the file
    await fs.promises.unlink(filePath);

    return NextResponse.json({
      success: true,
      message: 'Document removed from knowledge base'
    });
  } catch (error) {
    console.error('Error removing from knowledge base:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove document from knowledge base' },
      { status: 500 }
    );
  }
}
