'use client';

import React, { useState, useEffect } from 'react';
// import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";

interface PdfTextExtractorProps {
  filePath?: string;
  fileUrl?: string;
  filename?: string;
}

export function PdfTextExtractor({ filePath: _filePath, fileUrl, filename }: PdfTextExtractorProps) {
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load PDF.js script dynamically
  useEffect(() => {
    const loadPdfJs = async () => {
      if (!(window as any).pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
        script.async = true;
        script.onload = () => {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
          
          if (fileUrl) {
            extractTextFromUrl(fileUrl);
          }
        };
        document.body.appendChild(script);
      } else if (fileUrl) {
        extractTextFromUrl(fileUrl);
      }
    };

    loadPdfJs();
  }, [fileUrl]);

  // Extract text from PDF URL
  const extractTextFromUrl = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js library not loaded');
      }
      
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      
      const numPages = pdf.numPages;
      let text = `PDF: ${filename || 'Document'} (${numPages} pages)\n\n`;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        text += `--- Page ${i} ---\n`;
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        text += pageText + '\n\n';
      }
      
      setExtractedText(text);
    } catch (err) {
      console.error('Error extracting PDF text:', err);
      setError(`Failed to extract text: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js library not loaded');
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({data: new Uint8Array(arrayBuffer)}).promise;
      
      const numPages = pdf.numPages;
      let text = `PDF: ${file.name} (${numPages} pages)\n\n`;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        text += `--- Page ${i} ---\n`;
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        text += pageText + '\n\n';
      }
      
      setExtractedText(text);
    } catch (err) {
      console.error('Error extracting PDF text:', err);
      setError(`Failed to extract text: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pdf-text-extractor">
      {/* File upload section */}
      <div className="mb-4 p-4 border rounded-md bg-gray-50">
        <div className="flex items-center mb-2">
          <FileText className="h-5 w-5 mr-2 text-gray-500" />
          <h3 className="font-medium">Extract PDF Text</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          Upload a PDF file to extract its text content directly in the browser.
        </p>
        
        <div className="flex items-center">
          <input
            type="file"
            id="pdf-upload"
            accept=".pdf"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary/90"
          />
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-6 bg-gray-50 rounded-md">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span>Extracting text from PDF...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 text-red-700 rounded-md">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {/* Extracted text display */}
      {extractedText && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Extracted Text</h3>
          <pre className="p-4 bg-gray-50 rounded-md border text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[60vh]">
            {extractedText}
          </pre>
        </div>
      )}
    </div>
  );
}
