import { NextResponse } from 'next/server';
import { extractFromUrl } from '@/lib/services/content-extractor';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Try direct fetch first
    let extractedContent;
    let error;
    
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`Attempt ${i + 1} to extract content from ${url}`);
        extractedContent = await extractFromUrl(url);
        if (extractedContent && extractedContent.content && extractedContent.content !== 'No content could be extracted') {
          console.log('Successfully extracted content');
          break;
        }
        throw new Error('No content extracted');
      } catch (e) {
        error = e;
        console.log(`Attempt ${i + 1} failed:`, e);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    // If direct fetch fails, try using a proxy
    if (!extractedContent) {
      try {
        console.log('Trying with proxy...');
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        extractedContent = await extractFromUrl(proxyUrl);
      } catch (proxyError) {
        console.error('Proxy attempt failed:', proxyError);
        error = proxyError;
      }
    }

    if (!extractedContent || !extractedContent.content || extractedContent.content === 'No content could be extracted') {
      console.error('Failed to extract content:', error);
      return NextResponse.json({ 
        error: 'Failed to extract content. The site may be blocking our requests.'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      links: extractedContent.links,
      title: extractedContent.title,
      description: extractedContent.description,
      content: extractedContent.content,
      ogMetadata: extractedContent.ogMetadata
    });
    
  } catch (error) {
    console.error('Error in extract-links API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
