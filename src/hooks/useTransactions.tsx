// src/hooks/useTransactions.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
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
  const toast = useToast();

  // 1. Cek User & Load Data
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setUser(null);
        return;
      }
      setUser(currentUser);

      // Fetch data milik user ini saja
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", currentUser.id) 
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Gagal memuat data", status: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // 2. Add Transaction
  const addTransaction = async (newTx: Omit<Transaction, "id" | "user_id" | "date">) => {
    if (!user) return;
    try {
      const payload = {
        ...newTx,
        user_id: user.id,
        date: new Date().toISOString(), // Simpan format ISO standar
      };

      const { data, error } = await supabase.from("transactions").insert([payload]).select();
      if (error) throw error;

      if (data) {
        setTransactions([data[0], ...transactions]);
        toast({ title: "Transaksi Berhasil", status: "success", duration: 1500 });
      }
    } catch (err: any) {
      toast({ title: "Gagal simpan", description: err.message, status: "error" });
    }
  };

  // 3. Delete Transaction
  const deleteTransaction = async (id: number) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({ title: "Terhapus", status: "info", duration: 1000 });
    } catch (err) {
      toast({ title: "Gagal hapus", status: "error" });
    }
  };

  // 4. Reset Data (Hanya milik user)
  const resetData = async () => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("user_id", user.id);
      if (error) throw error;
      setTransactions([]);
      toast({ title: "Data di-reset bersih", status: "success" });
    } catch (err) {
      toast({ title: "Gagal reset", status: "error" });
    }
  };

  return {
    transactions,
    loading,
    user,
    addTransaction,
    deleteTransaction,
    resetData,
    refresh: fetchTransactions
  };
};