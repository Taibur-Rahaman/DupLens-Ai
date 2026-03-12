'use client';

import React from 'react';
import { Trash2, Info } from 'lucide-react';
import { ImageData, getThumbnailUrl, deleteImage } from '@/lib/api';

interface ImageGridProps {
  images: ImageData[];
  onImageDeleted: (imageId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ImageGrid({ images, onImageDeleted }: ImageGridProps) {
  const handleDelete = async (imageId: string) => {
    try {
      await deleteImage(imageId);
      onImageDeleted(imageId);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Info className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">No images uploaded yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload some images to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {images.map((image) => (
        <div
          key={image.id}
          className="group relative card-hover overflow-hidden"
        >
          <div className="aspect-square bg-gray-100 overflow-hidden">
            <img
              src={getThumbnailUrl(image.thumbnail_url)}
              alt={image.filename}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs font-medium truncate">{image.filename}</p>
            <p className="text-xs text-gray-300">
              {image.width}x{image.height} &bull; {formatFileSize(image.file_size)}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(image.id);
            }}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
            title="Delete image"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Q: {image.quality_score.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}
