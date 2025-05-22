import { NextResponse } from 'next/server';
import { extractFromFile } from '@/lib/services/content-extractor';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';
import * as path from 'path';

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate a unique filename using timestamp and random number
    const fileExtension = file.name.split('.').pop() || '';
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 10000);
    const uniqueFilename = `${timestamp}_${randomNum}.${fileExtension}`;
    const filePath = join(uploadsDir, uniqueFilename);

    // Convert file to buffer and save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);
    console.log(`File saved to ${filePath}`);

    // Extract content from the file
    let extractedContent;
    try {
      extractedContent = await extractFromFile(filePath);
      console.log(`Extracted content from ${file.name}, type: ${extractedContent.type}`);
    } catch (extractError) {
      console.error('Error extracting content:', extractError);
      
      // If extraction fails, provide basic information about the file
      const stats = await fs.promises.stat(filePath);
      const ext = path.extname(file.name).toLowerCase();
      
      extractedContent = {
        content: `This file could not be fully extracted. File size: ${stats.size} bytes.`,
        type: ext === '.pdf' ? 'application/pdf' : 'application/octet-stream',
        filename: file.name
      };
    }
    
    // For PDF files, we need to handle them specially
    const fileExt = path.extname(file.name).toLowerCase();
    if (fileExt === '.pdf') {
      // For PDFs, we'll store the file path for potential future processing
      // Enhance the extracted content with more detailed information to help the user
      let enhancedContent;
      const fileSize = buffer.length;
      const fileSizeDisplay = `${(fileSize / 1024).toFixed(2)} KB`;
      
      if (extractedContent.content && typeof extractedContent.content === 'string' && extractedContent.content.length > 50) {
        // We have good extracted content
        enhancedContent = `# PDF Document: ${file.name}

Size: ${fileSizeDisplay}

## Extracted Content:

${extractedContent.content}`;
      } else {
        // Limited or no extracted content
        enhancedContent = `# PDF Document: ${file.name}

Size: ${fileSizeDisplay}

This is a PDF document. The system has extracted the following content:

${extractedContent.content || 'No text could be reliably extracted. This may be a scanned document, an image-based PDF, or a protected file.'}`;
      }
      
      return NextResponse.json({
        success: true,
        filename: file.name,
        savedAs: uniqueFilename,
        content: enhancedContent,
        type: 'application/pdf',
        title: extractedContent.title || file.name,
        metadata: {
          ...(extractedContent.metadata ? extractedContent.metadata : {}),
          filePath,
          fileSize: buffer.length
        }
      });
    }
    
    // Return the extracted content
    return NextResponse.json({
      success: true,
      filename: file.name,
      savedAs: uniqueFilename,
      content: extractedContent.content,
      type: extractedContent.type,
      title: extractedContent.title || file.name,
      metadata: extractedContent.metadata || {}
    });
  } catch (error) {
    console.error('Error processing file upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}

// Set larger body size limit for file uploads (30MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb',
    },
  },
};
