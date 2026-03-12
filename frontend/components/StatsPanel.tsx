'use client';

import React from 'react';
import { Image, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Stats } from '@/lib/api';

interface StatsPanelProps {
  stats: Stats | null;
  isLoading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function StatsPanel({ stats, isLoading }: StatsPanelProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div>
                <div className="w-12 h-6 bg-gray-200 rounded mb-1" />
                <div className="w-16 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard
        icon={<Image className="w-5 h-5 text-primary-600" />}
        label="Total Images"
        value={stats.total_images}
        color="bg-primary-100"
      />
      <StatCard
        icon={<Search className="w-5 h-5 text-amber-600" />}
        label="Duplicates Found"
        value={stats.duplicates_found}
        color="bg-amber-100"
      />
      <StatCard
        icon={<Clock className="w-5 h-5 text-blue-600" />}
        label="Pending Review"
        value={stats.pending_reviews}
        color="bg-blue-100"
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5 text-green-600" />}
        label="Confirmed"
        value={stats.confirmed_duplicates}
        color="bg-green-100"
      />
      <StatCard
        icon={<XCircle className="w-5 h-5 text-red-600" />}
        label="Rejected"
        value={stats.rejected_pairs}
        color="bg-red-100"
      />
    </div>
  );
}
