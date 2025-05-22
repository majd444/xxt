import { NextRequest, NextResponse } from 'next/server';
import contentExtractorService from '../../../../lib/services/content-extractor';

/**
 * Extract content from a URL or file
 * 
 * POST /api/content/extract
 * Body: { url: string } or { filePath: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, filePath } = body;
    
    // Determine which extraction method to use
    if (url) {
      // Extract content from URL
      const content = await contentExtractorService.extractFromUrl(url);
      return NextResponse.json({ success: true, content });
    } else if (filePath) {
      // Extract content from file
      const content = await contentExtractorService.extractFromFile(filePath);
      return NextResponse.json({ success: true, content });
    } else {
      return NextResponse.json({ error: 'Either url or filePath is required' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error extracting content:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}
