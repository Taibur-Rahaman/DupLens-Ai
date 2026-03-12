import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export interface ImageData {
  id: string;
  filename: string;
  width: number;
  height: number;
  format: string;
  file_size: number;
  quality_score: number;
  thumbnail_url: string;
  image_url: string;
}

export interface DuplicatePair {
  id: string;
  image1: ImageData;
  image2: ImageData;
  similarity_score: number;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface UploadResponse {
  message: string;
  uploaded_count: number;
  images: ImageData[];
}

export interface Stats {
  total_images: number;
  total_processed: number;
  duplicates_found: number;
  confirmed_duplicates: number;
  rejected_pairs: number;
  pending_reviews: number;
  threshold: number;
}

export const uploadImages = async (files: File[]): Promise<UploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await api.post<UploadResponse>('/upload-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const findDuplicates = async (threshold?: number): Promise<DuplicatePair[]> => {
  const params = threshold ? { threshold } : {};
  const response = await api.get<DuplicatePair[]>('/find-duplicates', { params });
  return response.data;
};

export const getPendingDuplicates = async (): Promise<DuplicatePair[]> => {
  const response = await api.get<DuplicatePair[]>('/pending-duplicates');
  return response.data;
};

export const confirmDuplicate = async (
  pairId: string,
  action: 'confirm' | 'reject'
): Promise<{ message: string; pair_id: string; status: string }> => {
  const response = await api.post('/confirm-duplicate', {
    pair_id: pairId,
    action,
  });
  return response.data;
};

export const getAllImages = async (): Promise<ImageData[]> => {
  const response = await api.get<ImageData[]>('/images');
  return response.data;
};

export const deleteImage = async (
  imageId: string
): Promise<{ message: string; image_id: string }> => {
  const response = await api.delete(`/images/${imageId}`);
  return response.data;
};

export const getStats = async (): Promise<Stats> => {
  const response = await api.get<Stats>('/stats');
  return response.data;
};

export const clearAll = async (): Promise<{ message: string }> => {
  const response = await api.post('/clear');
  return response.data;
};

export const getImageUrl = (imageUrl: string): string => {
  return `${API_BASE_URL}${imageUrl}`;
};

export const getThumbnailUrl = (thumbnailUrl: string): string => {
  return `${API_BASE_URL}${thumbnailUrl}`;
};

export const getExportUrl = (): string => {
  return `${API_BASE_URL}/export-clean`;
};

export default api;
