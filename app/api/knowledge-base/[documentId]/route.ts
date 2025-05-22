import { NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import * as fs from 'fs';

// GET: Retrieve a specific document from the knowledge base
export async function GET(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const knowledgeBaseDir = join(process.cwd(), 'knowledge-base');
    const filePath = join(knowledgeBaseDir, `${documentId}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Read document content
    const content = await readFile(filePath, 'utf-8');
    const documentData = JSON.parse(content);

    return NextResponse.json({
      success: true,
      documentId,
      filename: documentData.filename,
      title: documentData.title,
      type: documentData.type,
      content: documentData.content,
      metadata: documentData.metadata,
      addedAt: documentData.addedAt
    });
  } catch (error) {
    console.error('Error retrieving document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve document' },
      { status: 500 }
    );
  }
}
