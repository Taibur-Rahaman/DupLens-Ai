'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadImages, UploadResponse } from '@/lib/api';

interface UploadZoneProps {
  onUploadComplete: (response: UploadResponse) => void;
}

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      setUploadStatus('idle');

      try {
        const response = await uploadImages(acceptedFiles);
        setUploadStatus('success');
        setStatusMessage(`Successfully uploaded ${response.uploaded_count} images`);
        onUploadComplete(response);
      } catch (error) {
        setUploadStatus('error');
        setStatusMessage('Failed to upload images. Please try again.');
        console.error('Upload error:', error);
      } finally {
        setIsUploading(false);
        setTimeout(() => {
          setUploadStatus('idle');
          setStatusMessage('');
        }, 3000);
      }
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'],
      'application/zip': ['.zip'],
    },
    disabled: isUploading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
              <p className="text-lg font-medium text-gray-700">Uploading images...</p>
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-lg font-medium text-green-700">{statusMessage}</p>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-lg font-medium text-red-700">{statusMessage}</p>
            </>
          ) : (
            <>
              <div className="p-4 bg-primary-100 rounded-full">
                {isDragActive ? (
                  <FileImage className="w-10 h-10 text-primary-600" />
                ) : (
                  <Upload className="w-10 h-10 text-primary-600" />
                )}
              </div>

              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? 'Drop your images here' : 'Drag & drop images here'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  or click to select files
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  JPG
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  PNG
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  GIF
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  WEBP
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  ZIP
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
