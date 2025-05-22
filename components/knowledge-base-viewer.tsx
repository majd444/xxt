import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, File, Trash2, ExternalLink } from "lucide-react";

interface KnowledgeBaseDocument {
  id: string;
  filename: string;
  title: string;
  type: string;
  addedAt: string;
  size: number;
}

export function KnowledgeBaseViewer() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    id: string;
    title: string;
    content: string;
    type: string;
  } | null>(null);

  // Fetch knowledge base documents
  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/knowledge-base');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch knowledge base');
      }
      
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch knowledge base');
    } finally {
      setIsLoading(false);
    }
  };

  // Load documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // View document content
  const viewDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/${documentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch document');
      }
      
      const data = await response.json();
      if (data.success) {
        setSelectedDocument({
          id: data.documentId,
          title: data.title || data.filename,
          content: typeof data.content === 'string' 
            ? data.content 
            : JSON.stringify(data.content, null, 2),
          type: data.type
        });
        setShowDocumentDialog(true);
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch document');
    }
  };

  // Remove document from knowledge base
  const removeDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to remove this document from the knowledge base?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/knowledge-base?documentId=${documentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove document');
      }
      
      // Refresh document list
      fetchDocuments();
    } catch (error) {
      console.error('Error removing document:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove document');
    }
  };

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Knowledge Base</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchDocuments}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map(doc => (
            <Card key={doc.id} className="overflow-hidden">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{doc.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {doc.type.split('/')[1] || doc.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 text-sm text-gray-500">
                <div>Filename: {doc.filename}</div>
                <div>Added: {new Date(doc.addedAt).toLocaleString()}</div>
              </CardContent>
              <CardFooter className="p-2 bg-gray-50 flex justify-end space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  onClick={() => viewDocument(doc.id)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-red-500 hover:text-red-700"
                  onClick={() => removeDocument(doc.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            {isLoading 
              ? 'Loading documents...' 
              : searchQuery 
                ? 'No documents match your search' 
                : 'No documents in knowledge base'}
          </div>
        )}
      </div>
      
      {/* Document Content Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDocument && (
              <div className="p-3 bg-gray-50 rounded-md text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[50vh]">
                {selectedDocument.content}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
