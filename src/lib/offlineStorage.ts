// src/lib/offlineStorage.ts
// Utilities untuk menyimpan dan retrieve data offline

export interface CachedTransaction {
  id?: string;
  user_id: string;
  text: string;
  amount: number;
  date: string;
  category: string;
  wallet: string;
  _synced?: boolean;
  _createdAt?: number;
}

const TRANSACTIONS_KEY = 'cashflow_transactions_cache';
const SYNC_QUEUE_KEY = 'cashflow_sync_queue';

export const offlineStorage = {
  // Cache semua transactions untuk offline access
  setCachedTransactions: (transactions: CachedTransaction[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to cache transactions:', e);
    }
  },

  getCachedTransactions: (): CachedTransaction[] => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(TRANSACTIONS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error('Failed to retrieve cached transactions:', e);
      return [];
    }
  },

  // Queue untuk pending transactions
  addToSyncQueue: (transaction: CachedTransaction) => {
    if (typeof window === 'undefined') return;
    try {
      const queue = localStorage.getItem(SYNC_QUEUE_KEY);
      const syncQueue: CachedTransaction[] = queue ? JSON.parse(queue) : [];
      syncQueue.push({
        ...transaction,
        _synced: false,
        _createdAt: Date.now(),
      });
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    } catch (e) {
      console.error('Failed to add to sync queue:', e);
    }
  },

  getSyncQueue: (): CachedTransaction[] => {
    if (typeof window === 'undefined') return [];
    try {
      const queue = localStorage.getItem(SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      console.error('Failed to retrieve sync queue:', e);
      return [];
    }
  },

  clearSyncQueue: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (e) {
      console.error('Failed to clear sync queue:', e);
    }
  },

  removeSyncedItem: (transactionId: string) => {
    if (typeof window === 'undefined') return;
    try {
      const queue = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!queue) return;
      const syncQueue: CachedTransaction[] = JSON.parse(queue);
      const updated = syncQueue.filter(t => t.id !== transactionId);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove synced item:', e);
    }
  },

  // Check connection
  isOnline: () => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  },
};
