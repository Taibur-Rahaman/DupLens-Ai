'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ExternalLink,
} from 'lucide-react';
import {
  DuplicatePair,
  ImageData,
  getThumbnailUrl,
  getImageUrl,
  confirmDuplicate,
  deleteImage,
} from '@/lib/api';

interface CompareViewProps {
  pairs: DuplicatePair[];
  onPairProcessed: (pairId: string, action: string) => void;
  onImageDeleted: (imageId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function ImageCard({
  image,
  label,
  onDelete,
  isHigherQuality,
}: {
  image: ImageData;
  label: string;
  onDelete: () => void;
  isHigherQuality: boolean;
}) {
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <div className="relative card overflow-hidden">
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <span className="px-2 py-1 bg-black/60 text-white text-sm font-medium rounded">
            {label}
          </span>
          {isHigherQuality && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
              Higher Quality
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            onClick={() => setShowFullImage(true)}
            className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
            title="View full image"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <a
            href={getImageUrl(image.image_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="aspect-square bg-gray-100">
          <img
            src={getThumbnailUrl(image.thumbnail_url)}
            alt={image.filename}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="p-4 border-t border-gray-100">
          <p className="font-medium text-gray-900 truncate" title={image.filename}>
            {image.filename}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>
              <span className="text-gray-400">Size:</span>{' '}
              {image.width} x {image.height}
            </div>
            <div>
              <span className="text-gray-400">File:</span>{' '}
              {formatFileSize(image.file_size)}
            </div>
            <div>
              <span className="text-gray-400">Format:</span>{' '}
              {image.format}
            </div>
            <div>
              <span className="text-gray-400">Quality:</span>{' '}
              {image.quality_score.toFixed(1)}
            </div>
          </div>

          <button
            onClick={onDelete}
            className="mt-3 w-full btn-danger flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete This Image
          </button>
        </div>
      </div>

      {showFullImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg"
            onClick={() => setShowFullImage(false)}
          >
            <XCircle className="w-8 h-8" />
          </button>
          <img
            src={getImageUrl(image.image_url)}
            alt={image.filename}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default function CompareView({
  pairs,
  onPairProcessed,
  onImageDeleted,
}: CompareViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const pendingPairs = pairs.filter((p) => p.status === 'pending');

  if (pendingPairs.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900">All Done!</h3>
        <p className="text-gray-500 mt-2">
          No more duplicate pairs to review.
        </p>
      </div>
    );
  }

  const currentPair = pendingPairs[currentIndex];

  if (!currentPair) {
    setCurrentIndex(0);
    return null;
  }

  const handleConfirm = async () => {
    try {
      await confirmDuplicate(currentPair.id, 'confirm');
      onPairProcessed(currentPair.id, 'confirm');
      if (currentIndex >= pendingPairs.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      console.error('Failed to confirm duplicate:', error);
    }
  };

  const handleConfirmAndDelete = async () => {
    try {
      const lowerQualityImage = currentPair.image1.quality_score < currentPair.image2.quality_score
        ? currentPair.image1
        : currentPair.image2;
      
      await confirmDuplicate(currentPair.id, 'confirm');
      await deleteImage(lowerQualityImage.id);
      
      onPairProcessed(currentPair.id, 'confirm');
      onImageDeleted(lowerQualityImage.id);
      
      if (currentIndex >= pendingPairs.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      console.error('Failed to confirm and delete:', error);
    }
  };

  const handleReject = async () => {
    try {
      await confirmDuplicate(currentPair.id, 'reject');
      onPairProcessed(currentPair.id, 'reject');
      if (currentIndex >= pendingPairs.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      console.error('Failed to reject duplicate:', error);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteImage(imageId);
      onImageDeleted(imageId);
      if (currentIndex >= pendingPairs.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex(Math.min(pendingPairs.length - 1, currentIndex + 1));
  };

  const image1HigherQuality =
    currentPair.image1.quality_score > currentPair.image2.quality_score;
  const image2HigherQuality =
    currentPair.image2.quality_score > currentPair.image1.quality_score;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-500">
            Reviewing {currentIndex + 1} of {pendingPairs.length} pairs
          </span>
          <div className="w-48 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / pendingPairs.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === pendingPairs.length - 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-center">
        <p className="text-sm text-primary-700">
          <span className="font-semibold">Similarity Score:</span>{' '}
          {(100 - currentPair.similarity_score).toFixed(1)}%
          <span className="text-primary-500 ml-2">
            (Lower score difference = more similar)
          </span>
        </p>
      </div>

      <div className="flex gap-6">
        <ImageCard
          image={currentPair.image1}
          label="Image A"
          onDelete={() => handleDeleteImage(currentPair.image1.id)}
          isHigherQuality={image1HigherQuality}
        />

        <div className="flex items-center">
          <div className="w-px h-full bg-gray-200" />
        </div>

        <ImageCard
          image={currentPair.image2}
          label="Image B"
          onDelete={() => handleDeleteImage(currentPair.image2.id)}
          isHigherQuality={image2HigherQuality}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-gray-200">
        <button onClick={handleConfirm} className="btn-success flex items-center gap-2 px-5">
          <CheckCircle className="w-5 h-5" />
          Mark as Duplicate
        </button>
        <button onClick={handleConfirmAndDelete} className="btn-danger flex items-center gap-2 px-5">
          <Trash2 className="w-5 h-5" />
          Duplicate & Delete Lower Quality
        </button>
        <button onClick={handleReject} className="btn-secondary flex items-center gap-2 px-5">
          <XCircle className="w-5 h-5" />
          Not Duplicate
        </button>
      </div>
    </div>
  );
}
