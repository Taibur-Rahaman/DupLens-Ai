'use client';

import React from 'react';
import { Aperture, Trash2, Download, Loader2 } from 'lucide-react';
import { getExportUrl } from '@/lib/api';

interface HeaderProps {
  onClearAll: () => void;
  imageCount: number;
}

export default function Header({ onClearAll, imageCount }: HeaderProps) {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleClearAll = () => {
    if (showConfirm) {
      onClearAll();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  const handleExport = async () => {
    if (imageCount === 0) return;
    
    setIsExporting(true);
    try {
      const link = document.createElement('a');
      link.href = getExportUrl();
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-lg shadow-primary-500/25">
              <Aperture className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">DupLens AI</h1>
              <p className="text-xs text-gray-500">Duplicate Image Detector</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={imageCount === 0 || isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download all clean images as ZIP"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export Clean ZIP
            </button>

            <button
              onClick={handleClearAll}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {showConfirm ? 'Click to Confirm' : 'Clear All'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
