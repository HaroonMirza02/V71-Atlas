import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface SystemMetrics {
  signals: {
    totalSignals: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  };
  connectors: Array<{
    connectorId: string;
    isEnabled: boolean;
    fetched: number;
    ingested: number;
    consecutiveErrors: number;
  }>;
  queue: {
    waiting: number;
    active: number;
    failed: number;
    completed: number;
  };
  system: {
    uptimeSeconds: number;
  };
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const { data } = await api.get<SystemMetrics>('/metrics');
      return data;
    },
    refetchInterval: 15000, // Refresh every 15s for lively feel
  });
}

export interface Signal {
  _id: string;
  id: string; // mapped from _id for ease
  title: string;
  description: string;
  category: string;
  status: string;
  url: string;
  tags: string[];
  technologies: string[];
  company?: string;
  budget?: number;
  currency?: string;
  discoveredAt: string;
  sourceId: string;
}

export function useSignals(params?: { category?: string; status?: string; limit?: number; search?: string; cursor?: string }) {
  return useQuery({
    queryKey: ['signals', params],
    queryFn: async () => {
      const { data } = await api.get('/signals', { params });
      return data as { data: Signal[]; pagination: { cursor?: string; hasMore: boolean; limit: number } };
    },
  });
}
