'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Upload, GitCompare, Loader2, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import StatsPanel from '@/components/StatsPanel';
import { UploadZone, ImageGrid } from '@/components/upload-ui';
import { CompareView } from '@/components/compare-ui';
import {
  ImageData,
  DuplicatePair,
  Stats,
  UploadResponse,
  getAllImages,
  findDuplicates,
  getStats,
  clearAll,
} from '@/lib/api';

type TabType = 'upload' | 'scan' | 'review';

interface TabButtonProps {
  tab: TabType;
  currentTab: TabType;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: (tab: TabType) => void;
}

function TabButton({ tab, currentTab, icon, label, count, onClick }: TabButtonProps) {
  const isActive = tab === currentTab;

  return (
    <button
      onClick={() => onClick(tab)}
      className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
        isActive
          ? 'text-primary-600 border-primary-600'
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [images, setImages] = useState<ImageData[]>([]);
  const [duplicatePairs, setDuplicatePairs] = useState<DuplicatePair[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [imagesData, statsData] = await Promise.all([
        getAllImages(),
        getStats(),
      ]);
      setImages(imagesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUploadComplete = (response: UploadResponse) => {
    setImages((prev) => [...prev, ...response.images]);
    loadData();
  };

  const handleImageDeleted = (imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    setDuplicatePairs((prev) =>
      prev.filter(
        (pair) => pair.image1.id !== imageId && pair.image2.id !== imageId
      )
    );
    loadData();
  };

  const handleScanForDuplicates = async () => {
    setIsScanning(true);
    try {
      const pairs = await findDuplicates();
      setDuplicatePairs(pairs);
      await loadData();

      const pendingCount = pairs.filter((p) => p.status === 'pending').length;
      if (pendingCount > 0) {
        setActiveTab('review');
      }
    } catch (error) {
      console.error('Failed to scan for duplicates:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePairProcessed = (pairId: string, action: string) => {
    setDuplicatePairs((prev) =>
      prev.map((pair) =>
        pair.id === pairId
          ? { ...pair, status: action === 'confirm' ? 'confirmed' : 'rejected' }
          : pair
      )
    );
    loadData();
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      setImages([]);
      setDuplicatePairs([]);
      setStats(null);
      loadData();
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  const pendingCount = duplicatePairs.filter((p) => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onClearAll={handleClearAll} imageCount={images.length} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <StatsPanel stats={stats} isLoading={isLoading} />
        </div>

        <div className="card">
          <div className="border-b border-gray-200">
            <nav className="flex gap-2 px-4">
              <TabButton
                tab="upload"
                currentTab={activeTab}
                icon={<Upload className="w-5 h-5" />}
                label="Upload Images"
                count={images.length}
                onClick={setActiveTab}
              />
              <TabButton
                tab="scan"
                currentTab={activeTab}
                icon={<Search className="w-5 h-5" />}
                label="Scan Images"
                onClick={setActiveTab}
              />
              <TabButton
                tab="review"
                currentTab={activeTab}
                icon={<GitCompare className="w-5 h-5" />}
                label="Review Duplicates"
                count={pendingCount}
                onClick={setActiveTab}
              />
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'upload' && (
              <div className="space-y-8">
                <UploadZone onUploadComplete={handleUploadComplete} />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Uploaded Images
                    </h2>
                    <button
                      onClick={loadData}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                  <ImageGrid images={images} onImageDeleted={handleImageDeleted} />
                </div>
              </div>
            )}

            {activeTab === 'scan' && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6">
                  <Search className="w-10 h-10 text-primary-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Scan for Duplicates
                </h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Analyze all uploaded images to find potential duplicates using
                  perceptual hashing algorithms.
                </p>

                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={handleScanForDuplicates}
                    disabled={isScanning || images.length < 2}
                    className="btn-primary flex items-center gap-2 px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Start Scan
                      </>
                    )}
                  </button>

                  {images.length < 2 && (
                    <p className="text-sm text-amber-600">
                      Upload at least 2 images to scan for duplicates
                    </p>
                  )}

                  {duplicatePairs.length > 0 && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800">
                        <span className="font-semibold">
                          {duplicatePairs.length}
                        </span>{' '}
                        potential duplicate pairs found.
                        {pendingCount > 0 && (
                          <>
                            {' '}
                            <button
                              onClick={() => setActiveTab('review')}
                              className="underline font-medium hover:text-green-900"
                            >
                              Review them now
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <CompareView
                pairs={duplicatePairs}
                onPairProcessed={handlePairProcessed}
                onImageDeleted={handleImageDeleted}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 text-center text-sm text-gray-500 border-t border-gray-200">
        <p>DupLens AI - Intelligent Duplicate Image Detection</p>
      </footer>
    </div>
  );
}
