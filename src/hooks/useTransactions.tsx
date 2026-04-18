// src/hooks/useTransactions.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { offlineStorage, CachedTransaction } from "@/lib/offlineStorage";
import { useToast } from "@chakra-ui/react";

export interface Transaction {
  id: number;
  user_id: string;
  text: string;
  amount: number;
  date: string; // ISO String
  category: string;
  wallet: string;
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState<CachedTransaction[]>([]);
  const toast = useToast();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1. Cek User & Load Data
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setUser(null);
        // Load from offline cache jika tersedia
        const cached = offlineStorage.getCachedTransactions();
        setTransactions(cached as Transaction[]);
        return;
      }
      setUser(currentUser);

      // Try to fetch from Supabase
      if (offlineStorage.isOnline()) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", currentUser.id) 
          .order("date", { ascending: false });

        if (error) throw error;
        
        const fetchedData = data || [];
        setTransactions(fetchedData as Transaction[]);
        
        // Cache untuk offline access
        offlineStorage.setCachedTransactions(fetchedData as CachedTransaction[]);
      } else {
        // Load from cache jika offline
        const cached = offlineStorage.getCachedTransactions();
        setTransactions(cached as Transaction[]);
      }
    } catch (err: any) {
      console.error("Fetch transactions error:", err);
      
      // Fallback ke cache jika error
      const cached = offlineStorage.getCachedTransactions();
      setTransactions(cached as Transaction[]);
      
      toast({ 
        title: isOnline ? "Gagal memuat data" : "Offline - menampilkan data tersimpan",
        status: isOnline ? "error" : "warning" 
      });
    } finally {
      setLoading(false);
    }
  }, [toast, isOnline]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // 2. Add Transaction (dengan offline support)
  const addTransaction = async (newTx: Omit<Transaction, "id" | "user_id" | "date">) => {
    if (!user) return;
    try {
      const payload = {
        ...newTx,
        user_id: user.id,
        date: new Date().toISOString(),
      };

      if (offlineStorage.isOnline()) {
        // Online - langsung ke Supabase
        const { data, error } = await supabase
          .from("transactions")
          .insert([payload])
          .select();
        
        if (error) throw error;

        if (data) {
          setTransactions([data[0] as Transaction, ...transactions]);
          offlineStorage.setCachedTransactions([data[0] as CachedTransaction, ...transactions as CachedTransaction[]]);
          toast({ title: "Transaksi Berhasil", status: "success", duration: 1500 });
        }
      } else {
        // Offline - simpan ke queue
        const tempId = `temp_${Date.now()}`;
        const offlineTx: CachedTransaction = {
          ...payload,
          id: tempId,
          _synced: false,
        };
        
        offlineStorage.addToSyncQueue(offlineTx);
        setTransactions([offlineTx as Transaction, ...transactions]);
        setSyncQueue(prev => [...prev, offlineTx]);
        
        toast({ 
          title: "Transaksi disimpan offline", 
          description: "Akan sinkron saat online",
          status: "info", 
          duration: 1500 
        });
      }
    } catch (err: any) {
      toast({ title: "Gagal simpan", description: err.message, status: "error" });
    }
  };

  // 3. Sync offline transactions saat online
  const syncOfflineTransactions = useCallback(async () => {
    if (!user || !offlineStorage.isOnline()) return;

    try {
      const queue = offlineStorage.getSyncQueue();
      if (queue.length === 0) return;

      for (const tx of queue) {
        const { id: _, _synced, _createdAt, ...payload } = tx;
        
        const { data, error } = await supabase
          .from("transactions")
          .insert([payload])
          .select();
        
        if (error) throw error;
        
        if (data) {
          offlineStorage.removeSyncedItem(tx.id || '');
        }
      }
      
      setSyncQueue([]);
      await fetchTransactions();
      
      toast({ 
        title: "Sinkronisasi berhasil", 
        status: "success", 
        duration: 1000 
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({ title: "Gagal sinkronisasi", status: "error" });
    }
  }, [user, toast, fetchTransactions]);

  // Sinkron saat online
  useEffect(() => {
    if (isOnline) {
      syncOfflineTransactions();
    }
  }, [isOnline, syncOfflineTransactions]);

  // 4. Delete Transaction
  const deleteTransaction = async (id: number | string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      setTransactions(prev => prev.filter(t => t.id !== id));
      offlineStorage.setCachedTransactions(transactions.filter(t => t.id !== id) as CachedTransaction[]);
      
      toast({ title: "Terhapus", status: "info", duration: 1000 });
    } catch (err) {
      toast({ title: "Gagal hapus", status: "error" });
    }
  };

  // 5. Reset Data (Hanya milik user)
  const resetData = async () => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("user_id", user.id);
      if (error) throw error;
      
      setTransactions([]);
      offlineStorage.setCachedTransactions([]);
      setSyncQueue([]);
      
      toast({ title: "Data di-reset bersih", status: "success" });
    } catch (err) {
      toast({ title: "Gagal reset", status: "error" });
    }
  };

  return {
    transactions,
    loading,
    user,
    isOnline,
    syncQueue,
    addTransaction,
    deleteTransaction,
    resetData,
    refresh: fetchTransactions,
    syncNow: syncOfflineTransactions,
  };
};