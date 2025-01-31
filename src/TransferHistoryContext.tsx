import React, { createContext, useContext, useState } from 'react';
import { useHttpClient } from './HttpClientContext';
interface TransferHistoryItem {
  u?: string;
  unm?: string;
  dt: string;
  trp: number;
  t: number;
}

interface TransferHistoryCache {
  [key: string]: {
    data: TransferHistoryItem[];
    timestamp: number;
  };
}

interface TransferHistoryContextType {
  getTransferHistory: (leagueId: string, playerId: string) => Promise<TransferHistoryItem[]>;
  clearCache: () => void;
}

const TransferHistoryContext = createContext<TransferHistoryContextType | null>(null);

// Cache expiration time: 1 hour
const CACHE_EXPIRATION = 60 * 60 * 1000;

export const TransferHistoryProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const httpClient = useHttpClient();
  const [cache, setCache] = useState<TransferHistoryCache>({});

  const getTransferHistory = async (leagueId: string, playerId: string): Promise<TransferHistoryItem[]> => {
    const cacheKey = `${leagueId}-${playerId}`;
    const now = Date.now();

    // Check if we have a valid cached response
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_EXPIRATION) {
      return cache[cacheKey].data;
    }

    // If not in cache or expired, fetch from API
    try {
      const response = await httpClient.get<{ it: TransferHistoryItem[] }>(`/v4/leagues/${leagueId}/players/${playerId}/transferHistory?start=1`);
      const data = response;
      
      // Update cache
      setCache(prevCache => ({
        ...prevCache,
        [cacheKey]: {
          data: data.it,
          timestamp: now
        }
      }));

      return data.it;
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      throw error;
    }
  };

  const clearCache = () => {
    setCache({});
  };

  return (
    <TransferHistoryContext.Provider value={{ getTransferHistory, clearCache }}>
      {children}
    </TransferHistoryContext.Provider>
  );
};

export const useTransferHistory = () => {
  const context = useContext(TransferHistoryContext);
  if (!context) {
    throw new Error('useTransferHistory must be used within a TransferHistoryProvider');
  }
  return context;
}; 