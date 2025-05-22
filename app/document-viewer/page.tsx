'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, AlertCircle, Upload } from "lucide-react";
import { DocumentViewer } from "@/components/document-viewer";

export default function DocumentViewerPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Fetch documents from the knowledge base
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/knowledge-base');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.documents)) {
          setDocuments(data.documents);
        } else {
          setError('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadStatus('Uploading...');
    
    try {
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch('/api/extract-document', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUploadStatus(`Successfully uploaded ${result.files.length} file(s)`);
        // Refresh the document list
        const kbResponse = await fetch('/api/knowledge-base');
        if (kbResponse.ok) {
          const kbData = await kbResponse.json();
          if (kbData.success && Array.isArray(kbData.documents)) {
            setDocuments(kbData.documents);
          }
        }
      } else {
        setUploadStatus(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setUploadStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadedFiles([]);
    }
  };

  // View document content
  const viewDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/${documentId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedDocument(data);
      } else {
        setError(`Failed to fetch document: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Document Viewer</h1>
      
      <Tabs defaultValue="documents">
        <TabsList className="mb-4">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>
                    {documents.length} document(s) in the knowledge base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : error ? (
                    <div className="text-red-500 p-4">
                      <AlertCircle className="h-5 w-5 inline-block mr-2" />
                      {error}
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No documents found
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {documents.map((doc) => (
                        <div 
                          key={doc.documentId}
                          className={`p-3 rounded-md cursor-pointer flex items-center ${
                            selectedDocument?.documentId === doc.documentId 
                              ? 'bg-primary/10 border border-primary/30' 
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => viewDocument(doc.documentId)}
                        >
                          <FileText className="h-5 w-5 mr-2 flex-shrink-0 text-gray-500" />
                          <div className="overflow-hidden">
                            <div className="font-medium truncate">{doc.filename || doc.title}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {doc.type} • {new Date(doc.addedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              {selectedDocument ? (
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>{selectedDocument.filename || selectedDocument.title}</CardTitle>
                    <CardDescription>
                      Document ID: {selectedDocument.documentId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DocumentViewer 
                      documentId={selectedDocument.documentId}
                      content={selectedDocument.content}
                      filename={selectedDocument.filename}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Select a document to view its content</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload PDF, DOCX, or text files to extract their content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.html,.htm,.md"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <span className="text-sm font-medium">
                    Click to select files or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, DOCX, TXT, HTML, MD files supported
                  </span>
                </label>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium text-sm mb-2">Selected Files:</h3>
                    <ul className="text-sm text-left space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-gray-500" />
                          {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {uploadStatus && (
                <div className={`mt-4 p-3 rounded-md ${
                  uploadStatus.startsWith('Error') || uploadStatus.startsWith('Upload failed')
                    ? 'bg-red-50 text-red-700'
                    : uploadStatus.startsWith('Successfully')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-blue-50 text-blue-700'
                }`}>
                  {uploadStatus}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || uploadedFiles.length === 0}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Files'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
