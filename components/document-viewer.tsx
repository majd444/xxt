import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Alert import removed as it's no longer used
import { Loader2, FileText, AlertCircle, FileQuestion } from "lucide-react";

interface DocumentViewerProps {
  documentId?: string;
  content?: string;
  filename?: string;
}

export function DocumentViewer({ documentId, content, filename }: DocumentViewerProps) {
  const [documentContent, setDocumentContent] = useState<string | null>(content || null);
  const [isLoading, setIsLoading] = useState(!content && !!documentId);
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(true); // Default to raw text for debugging
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [metadata, setMetadata] = useState<{filename?: string; type?: string; size?: string}>({});

  // Log content for debugging
  useEffect(() => {
    console.log('DocumentViewer received:', { documentId, contentLength: content?.length, filename });
    if (content) {
      console.log('Content preview:', content.substring(0, 100) + '...');
    }
  }, [documentId, content, filename]);

  // If documentId is provided but not content, fetch the content
  useEffect(() => {
    let isMounted = true;

    const fetchContent = async () => {
      if (!documentId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const res = await fetch(`/api/knowledge-base/${documentId}`);
        console.log('Fetching from API:', `/api/knowledge-base/${documentId}`);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch document: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('API response:', data);
        
        if (isMounted) {
          if (data.content) {
            const processedContent = typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2);
            setDocumentContent(processedContent);
            setMetadata({
              filename: data.filename || 'Unknown',
              type: data.type || 'text/plain',
              size: data.size || `${processedContent.length} characters`
            });
            setDebugInfo({
              type: typeof data.content,
              length: processedContent.length,
              preview: processedContent.substring(0, 200) + '...',
              metadata: {
                filename: data.filename,
                type: data.type,
                documentId: data.documentId
              }
            });
          } else {
            setError('No content found in document');
            setDebugInfo({ error: 'No content in response', data });
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        if (isMounted) {
          setError(`Error fetching document: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setIsLoading(false);
        }
      }
    };
    
    if (documentId && !content) {
      fetchContent();
    } else if (content) {
      // If content is directly provided
      const processedContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      setDocumentContent(processedContent);
      setDebugInfo({
        type: typeof content,
        length: processedContent.length,
        preview: processedContent.substring(0, 100) + '...'
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [documentId, content]);

  // Determine if content is from a PDF file
  const isPdf = filename?.toLowerCase().endsWith('.pdf') || (documentContent && documentContent.includes('PDF document'));

  // Handle loading and error states
  if (isLoading) {
    return (
      <Card>
        <div className="p-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading document content...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center text-red-500 mb-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            <h3 className="font-medium">Error</h3>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          {debugInfo && (
            <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      </Card>
    );
  }

  if (!documentContent) {
    return (
      <Card>
        <div className="p-4 text-center">
          <FileQuestion className="h-6 w-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">No document content available</p>
          {documentId && <p className="text-xs text-gray-400 mt-1">Document ID: {documentId}</p>}
          {filename && <p className="text-xs text-gray-400">Filename: {filename}</p>}
          {debugInfo && (
            <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto rounded text-left">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      </Card>
    );
  }
  
  // Render based on file type
  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-gray-50 text-sm font-medium border-b flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
          <div className="truncate max-w-xs">
            {filename || metadata.filename || (isPdf ? 'PDF Document' : 'Document Content')}
            {documentId && <span className="ml-2 text-xs text-gray-500">(ID: {documentId})</span>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {documentContent ? `${documentContent.length} characters` : ''}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowRawText(!showRawText)}
            className="text-xs whitespace-nowrap"
          >
            {showRawText ? 'Show Formatted' : 'Show Raw Text'}
          </Button>
        </div>
      </div>
      <div className="p-4 bg-white">
        {/* Debug information */}
        {debugInfo && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
            <details open>
              <summary className="cursor-pointer font-medium">Document Information</summary>
              <div className="mt-2 space-y-1">
                {metadata.filename && <p><span className="font-medium">Filename:</span> {metadata.filename}</p>}
                {metadata.type && <p><span className="font-medium">Type:</span> {metadata.type}</p>}
                {metadata.size && <p><span className="font-medium">Size:</span> {metadata.size}</p>}
                {documentId && <p><span className="font-medium">Document ID:</span> {documentId}</p>}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-600">Show Debug Information</summary>
                <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </details>
          </div>
        )}
        
        {showRawText ? (
          // Raw text view - shows unformatted content for debugging
          <div className="border rounded p-4 bg-gray-50 overflow-auto max-h-[60vh]">
            <pre className="text-sm whitespace-pre-wrap break-words font-mono">
              {documentContent}
            </pre>
          </div>
        ) : isPdf ? (
          // PDF formatted view
          <div className="border rounded overflow-hidden">
            <div className="p-4 bg-white">
              <div className="prose prose-sm max-w-none">
                {documentContent && documentContent.includes('#') ? (
                  // If content appears to be markdown, render with basic styling
                  <div className="text-sm">
                    {documentContent.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) {
                        return <h1 key={i} className="text-xl font-bold mt-2 mb-1">{line.substring(2)}</h1>;
                      } else if (line.startsWith('## ')) {
                        return <h2 key={i} className="text-lg font-semibold mt-2 mb-1">{line.substring(3)}</h2>;
                      } else if (line.startsWith('### ')) {
                        return <h3 key={i} className="text-md font-medium mt-2 mb-1">{line.substring(4)}</h3>;
                      } else if (line === '') {
                        return <br key={i} />;
                      } else {
                        return <p key={i} className="my-1">{line}</p>;
                      }
                    })}
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: documentContent.replace(/\n/g, '<br>') }} />
                )}
              </div>
            </div>
          </div>
        ) : (
          // Generic document content view
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: documentContent.replace(/\n/g, '<br>') }} />
          </div>
        )}
      </div>
    </Card>
  );
}
