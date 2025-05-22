import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { DocumentViewer } from "@/components/document-viewer";

interface DocumentContentViewerProps {
  documentId?: string;
  filename?: string;
  content?: string;
  originalContent?: string;
}

export function DocumentContentViewer({ 
  documentId, 
  filename, 
  content,
  originalContent
}: DocumentContentViewerProps) {
  const [documentContent, setDocumentContent] = useState<string | null>(content || originalContent || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReextracting, setIsReextracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  // Fetch document content from the API if needed
  useEffect(() => {
    if (!documentContent && documentId) {
      fetchDocumentContent();
    }
  }, [documentId]);

  // Fetch document content from the knowledge base API
  const fetchDocumentContent = async () => {
    if (!documentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await fetch(`/api/knowledge-base/${documentId}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch document: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success && data.content) {
        setDocumentContent(data.content);
      } else {
        setError('No content found in document');
      }
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(`Error fetching document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-extract content from the original file
  const reextractContent = async () => {
    if (!documentId) return;
    
    try {
      setIsReextracting(true);
      setError(null);
      
      // Find the original file path from localStorage
      const docKey = `document_${documentId}`;
      const storedData = localStorage.getItem(docKey);
      
      if (!storedData) {
        throw new Error('Original document data not found');
      }
      
      const docData = JSON.parse(storedData);
      
      if (!docData.metadata?.filePath) {
        throw new Error('Original file path not found');
      }
      
      // Call the extract-document API with the file path
      const res = await fetch('/api/reextract-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: docData.metadata.filePath,
          documentId: documentId
        }),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to re-extract document: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        setDocumentContent(data.content);
        setExtractionSuccess(true);
        
        // Update the localStorage entry
        const updatedDocData = {
          ...docData,
          content: data.content
        };
        localStorage.setItem(docKey, JSON.stringify(updatedDocData));
        
        // If this is in the knowledge base, update it there too
        try {
          await fetch(`/api/knowledge-base/${documentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: data.content
            }),
          });
        } catch (updateErr) {
          console.error('Error updating knowledge base:', updateErr);
        }
      } else {
        throw new Error(data.error || 'Failed to extract content');
      }
    } catch (err) {
      console.error('Error re-extracting content:', err);
      setError(`Error re-extracting content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsReextracting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-gray-500">Loading document content...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-red-500 mb-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            <h3 className="font-medium">Error</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchDocumentContent}
            className="mr-2"
          >
            Try Again
          </Button>
          {documentId && (
            <Button 
              variant="default" 
              size="sm"
              onClick={reextractContent}
            >
              Re-extract Content
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Re-extraction controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="h-5 w-5 mr-2 text-gray-500" />
          <span className="font-medium">{filename || 'Document Content'}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={reextractContent}
          disabled={isReextracting}
        >
          {isReextracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Re-extracting...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-extract Content
            </>
          )}
        </Button>
      </div>
      
      {/* Success message */}
      {extractionSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md text-sm">
          Content successfully re-extracted and updated.
        </div>
      )}
      
      {/* Document viewer */}
      <DocumentViewer 
        content={documentContent || ''} 
        filename={filename}
        documentId={documentId}
      />
    </div>
  );
}
