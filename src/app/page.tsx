"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Heading, Text, VStack, HStack, Input, Button,
  Card, CardBody, IconButton, Flex, Icon, Spinner, ButtonGroup, Select, SimpleGrid,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure,
  Badge, Progress, Avatar, Divider, Switch, Menu, MenuButton, MenuList, MenuItem, Alert, AlertIcon,
  useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, PinInput, PinInputField, FormControl, FormLabel, InputGroup, InputLeftAddon
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import {
  Home, History, Target, User, Trash2, Plus, WalletCards, ArrowUpRight, ArrowDownRight,
  Camera, LogOut, Sun, Moon, CheckCircle, Wallet, Image as ImageIcon,
  Download, FileText, FileSpreadsheet, Lock, Mail, Edit2, Phone, Eye, EyeOff, Bell, Calendar, Clock
} from "lucide-react";
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, CartesianGrid } from "recharts";
import { supabase } from "@/lib/supabase";
import { formatRupiah, parseAmount, detectCategory, blobToBase64 } from "@/utils/helpers";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import bcrypt from "bcryptjs"; // Pastikan sudah diinstall: npm install bcryptjs

const CATEGORIES = ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Gaji", "Pemasukan Tambahan", "Lainnya", "Jajan"];
const WALLETS = ["Tunai", "QRIS", "Debit", "Credit Card", "Gopay", "ShopeePay", "OVO", "Dana"];
const DAILY_LIMIT = 100000;
const float1 = keyframes`0% { transform: translate(0, 0); } 50% { transform: translate(25px, -20px); } 100% { transform: translate(0, 0); }`;
const float2 = keyframes`0% { transform: translate(0, 0); } 50% { transform: translate(-20px, 25px); } 100% { transform: translate(0, 0); }`;

export default function SuperApp() {
  const router = useRouter();
  const toast = useToast();
  
  // Dialogs & Refs
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<"home" | "mutasi" | "budget" | "profile">("home");
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile Data
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [userPinHash, setUserPinHash] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState(false); 

  // Reminder Settings
  const [reminderTime, setReminderTime] = useState("09:00"); 
  const [reminderDay, setReminderDay] = useState("1"); 

  // Data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

  // Form Transaction
  const [text, setText] = useState(""); const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Lainnya"); const [wallet, setWallet] = useState("Tunai");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [isScanning, setIsScanning] = useState(false); const [scanSuccess, setScanSuccess] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth().toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(""); const [editPhone, setEditPhone] = useState("");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isChangePinMode, setIsChangePinMode] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [isMutasiUnlocked, setIsMutasiUnlocked] = useState(false);
  const [budgetName, setBudgetName] = useState(""); const [budgetTarget, setBudgetTarget] = useState("");

  // UI/UX
  const [isBalanceHidden, setIsBalanceHidden] = useState(true); // Hide Saldo

  // Theme
  const theme = {
    bg: isDark ? "#0F0F0F" : "#FFFFFF",
    navBg: isDark ? "#181818" : "#FFFFFF",
    text: isDark ? "#E5E5E5" : "#2B3674",
    subText: isDark ? "#A3A3A3" : "#8C7E74",
    cardBg: isDark ? "#18181B" : "#FFFFFF",
    cardBorder: isDark ? "whiteAlpha.100" : "gray.100",
    primary: isDark ? "#E50914" : "#E53E3E", 
    accent: isDark ? "#B20710" : "#FC8181",
    homeGradient: isDark ? "linear(to-br, #E50914, #831010)" : "linear(to-br, #E53E3E, #FFFFFF)",
    blob1: isDark ? "red.900" : "red.100",
    blob2: isDark ? "black" : "orange.100",
    success: "#46d369", danger: "#E50914"
  };

  // --- DATA FETCHING ---
  const fetchProfile = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    if (data) {
        setProfileName(data.full_name || user?.email.split('@')[0] || "User");
        setProfilePhone(data.phone || "-");
        setUserPinHash(data.pin_hash || null);
        setHasPin(!!data.pin_hash);
        // Load Reminder Settings
        setReminderTime(data.reminder_time?.substring(0, 5) || "09:00");
        setReminderDay(data.reminder_day?.toString() || "1");
    }
  }, [user?.id, user?.email]);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (data) setTransactions(data);
  }, []);

  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase.from('budgets').select('*');
    if (data) setBudgets(data);
  }, []);

  // --- INIT + REALTIME ---
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("theme-dark");
    if (saved === "true") setIsDark(true);

    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.replace("/auth");
        setUser(session.user);

        await Promise.all([fetchProfile(), fetchTransactions(), fetchBudgets()]);
        setLoading(false);

        const channel = supabase.channel('public')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => fetchTransactions())
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'transactions' }, () => fetchTransactions())
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'budgets' }, () => fetchBudgets())
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'budgets' }, () => fetchBudgets())
          .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    init();
  }, [router, fetchProfile, fetchTransactions, fetchBudgets]);

  useEffect(() => {
    if (isMounted) localStorage.setItem("theme-dark", isDark.toString());
  }, [isDark, isMounted]);

  // --- PIN Logic (DENGAN HASH) ---
  const verifyPin = async () => {
    const isPinValid = (input: string, hash: string) => bcrypt.compare(input, hash);

    if (hasPin && userPinHash) {
        // Mode Verifikasi PIN Lama / Buka Mutasi
        const isValid = await isPinValid(pinInput, userPinHash);
        if (!isValid) {
            toast({ title: "PIN Salah", status: "error" }); setPinInput(""); return;
        }

        if (isChangePinMode) {
            // PIN Lama Benar, masuk ke mode set PIN Baru
            toast({ title: "Masukkan PIN Baru 6 Digit", status: "info" });
            setPinInput("");
            setHasPin(false); // Mode input PIN baru
            return;
        }

        // Buka Mutasi
        setIsMutasiUnlocked(true);
        setActiveTab("mutasi");
        toast({ title: "Akses Diberikan", status: "success", duration: 1500 });

    } else {
        // Mode Set PIN Baru (atau pertama kali set)
        if (pinInput.length !== 6) {
             toast({ title: "PIN harus 6 digit", status: "error" }); return;
        }
        
        const newHash = await bcrypt.hash(pinInput, 10);
        const { error } = await supabase.from('profiles').update({ pin_hash: newHash }).eq('id', user.id);
        
        if (error) { toast({ title: "Gagal Menyimpan PIN", status: "error" }); return; }
        
        setUserPinHash(newHash);
        setHasPin(true);
        toast({ title: "PIN Tersimpan!", status: "success" });

        if (activeTab === "mutasi") setIsMutasiUnlocked(true);
        if (isChangePinMode) setActiveTab("profile"); 
    }
    
    setIsPinModalOpen(false); 
    setPinInput(""); 
    setIsChangePinMode(false);
  };

  const handleTabChange = (tab: any) => {
    if (tab === "mutasi" && !isMutasiUnlocked && hasPin) {
      setIsPinModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // --- PROFILE UPDATE LOGIC ---
  const openEditProfile = () => {
    setEditName(profileName);
    setEditPhone(profilePhone.startsWith('62') ? profilePhone.substring(2) : profilePhone);
    setIsEditProfileOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!editName || !editPhone) { toast({ title: "Nama dan Nomor WhatsApp wajib diisi", status: "error" }); return; }
    const phoneToSave = editPhone.startsWith('62') ? editPhone : '62' + editPhone;

    try {
        const { error } = await supabase.from('profiles').update({ full_name: editName, phone: phoneToSave }).eq('id', user.id);
        if (error) throw error;
        
        await supabase.auth.updateUser({ data: { full_name: editName } });
        setProfileName(editName);
        setProfilePhone(phoneToSave);
        setIsEditProfileOpen(false);
        toast({ title: "Profil Diperbarui", status: "success" });
    } catch (error: any) {
        toast({ title: "Gagal Update", description: error.message, status: "error" });
    }
  };

  // --- REMINDER LOGIC ---
  const handleUpdateReminder = async () => {
    if (!reminderTime || !reminderDay || parseInt(reminderDay) < 1 || parseInt(reminderDay) > 28) {
        toast({ title: "Tanggal harus 1-28 dan waktu wajib diisi", status: "warning" });
        return;
    }

    try {
        const { error } = await supabase.from('profiles').update({ 
            reminder_time: reminderTime, 
            reminder_day: parseInt(reminderDay) 
        }).eq('id', user.id);

        if (error) throw error;

        toast({ title: "Pengaturan Reminder Tersimpan", status: "success" });
    } catch (error: any) {
        toast({ title: "Gagal Menyimpan", description: error.message, status: "error" });
    }
  };

  // --- TRANSACTION ACTIONS (MODIFIED FOR SAVING LOGIC) ---
  const handleSaveTransaction = async () => {
    if (!text || !amount) { toast({ title: "Keterangan dan Nominal wajib diisi", status: "warning" }); return; }
    
    const nominal = parseAmount(amount);
    const finalAmount = type === "expense" ? -Math.abs(nominal) : Math.abs(nominal);
    const baseTx = {
      category, wallet, date: new Date().toISOString(), user_id: user?.id
    };

    if (category === "Gaji" && finalAmount > 0) {
        // FITUR NABUNG/BUDGET OTOMATIS (30% ke Tabungan)
        const percentageForSaving = 0.30; 
        const savingAmount = Math.round(finalAmount * percentageForSaving);
        const remainingAmount = finalAmount - savingAmount;

        const txGajiBersih = { ...baseTx, amount: remainingAmount, text: `${text} (Gaji Bersih)` };
        const txSaving = { ...baseTx, amount: -savingAmount, category: "Nabung", text: `Potongan Otomatis Tabungan/Budget (${category})` };

        const { error } = await supabase.from('transactions').insert([txGajiBersih, txSaving]);
        
        if (error) { toast({ title: "Gagal menyimpan transaksi Gaji/Potongan", status: "error" }); return; }

    } else {
        // Transaksi Biasa (termasuk Nabung Manual)
        const { error } = await supabase.from('transactions').insert([{ ...baseTx, amount: finalAmount, text }]);
        if (error) { toast({ title: "Gagal menyimpan transaksi", status: "error" }); return; }
    }

    fetchTransactions();
    setText(""); setAmount(""); setScanSuccess(false);
    toast({ title: "Tersimpan", status: "success" });
  };

  const handleDeleteTransaction = async (id: number) => { await supabase.from('transactions').delete().eq('id', id); setTransactions(transactions.filter(t => t.id !== id)); };
  const handleAddBudget = async () => { if (!budgetName || !budgetTarget) return; const nominal = parseAmount(budgetTarget); const { data } = await supabase.from('budgets').insert([{ name: budgetName, target_amount: nominal, user_id: user?.id }]).select(); if (data) { setBudgets([...budgets, data[0]]); setBudgetName(""); setBudgetTarget(""); } };
  const handleDeleteBudget = async (id: number) => { await supabase.from('budgets').delete().eq('id', id); setBudgets(budgets.filter(b => b.id !== id)); };

  const handleReset = async () => {
    try {
      await supabase.from('budgets').delete().neq('id', 0); 
      const { error } = await supabase.from('transactions').delete().neq('id', 0);
      if (error) throw error;
      setTransactions([]); setBudgets([]);
      toast({ title: "Semua Data Direset", status: "success" }); onClose();
    } catch (error: any) { toast({ title: "Gagal Reset", description: error.message, status: "error" }); }
  };

  // --- SCAN (Implementation skipped for brevity) ---
  const resizeImage = (file: File): Promise<string> => { return new Promise((resolve) => { /* ... */ }); }; 
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ }; 

  // --- EXPORT HANDLERS ---
  const handleExport = async (type: 'pdf' | 'excel') => {
    const dataToExport = type === 'pdf' ? filteredData.map(t => [new Date(t.date).toLocaleDateString('id'), t.text, t.category, t.wallet, formatRupiah(t.amount)]) : [];
    
    if (type === 'pdf') {
        const doc = new jsPDF();
        doc.text(`Laporan: ${parseInt(filterMonth)+1}/${filterYear}`, 14, 10);
        autoTable(doc, { 
            head: [["Tgl", "Ket", "Kat", "Via", "Rp"]], 
            body: dataToExport
        });
        doc.save("Laporan_Keuangan.pdf");
    } else {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Keuangan');
        worksheet.columns = [
          { header: 'Tanggal', key: 'date', width: 15 },
          { header: 'Keterangan', key: 'text', width: 30 },
          { header: 'Kategori', key: 'category', width: 15 },
          { header: 'Via', key: 'wallet', width: 10 },
          { header: 'Nominal (Rp)', key: 'amount', width: 20 },
        ];
        filteredData.forEach(t => {
          worksheet.addRow({
            date: new Date(t.date).toLocaleDateString('id-ID'),
            text: t.text,
            category: t.category,
            wallet: t.wallet,
            amount: t.amount 
          });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan_Keuangan_${filterMonth}_${filterYear}.xlsx`);
    }
    toast({ title: "File Diunduh", status: "success", isClosable: true });
  };

  const handleEmailRequest = async () => {
    if (!user?.email) {
      toast({ title: "Email tidak ditemukan", status: "error" });
      return;
    }

    const toastId = toast({ title: "Sedang memproses...", status: "info", duration: null });

    try {
      const doc = new jsPDF();
      doc.text(`Laporan Keuangan: ${parseInt(filterMonth)+1}/${filterYear}`, 14, 10);
      
      const tableRows = filteredData.map(t => [
        new Date(t.date).toLocaleDateString('id-ID'), t.text, t.category, t.wallet,
        t.amount > 0 ? formatRupiah(t.amount) : "-", t.amount < 0 ? formatRupiah(Math.abs(t.amount)) : "-"
      ]);

      autoTable(doc, { 
        head: [["Tgl", "Ket", "Kat", "Via", "Masuk", "Keluar"]], 
        body: tableRows 
      });

      const pdfBlob = doc.output('blob');
      const base64String = await blobToBase64(pdfBlob); 

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          fileBase64: base64String,
          fileName: `Laporan_Keuangan_${filterMonth}_${filterYear}.pdf`,
          period: `${parseInt(filterMonth)+1}/${filterYear}`
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal kirim email");

      toast.close(toastId);
      toast({ title: "Email Terkirim! 📧", description: `Laporan dikirim ke ${user.email}`, status: "success", isClosable: true });

    } catch (error: any) {
      toast.close(toastId);
      console.error("Email Error:", error);
      toast({ title: "Gagal Kirim Email", description: error.message, status: "error" });
    }
  };

  // --- CALCULATIONS ---
  const balancePerWallet = useMemo(() => { // FITUR 5: Klasifikasi Saldo
    const wallets = WALLETS.reduce((acc: {[key: string]: number}, wallet) => { acc[wallet] = 0; return acc; }, {});
    transactions.forEach(t => { if (wallets.hasOwnProperty(t.wallet)) { wallets[t.wallet] += t.amount; } });
    return Object.keys(wallets).filter(key => wallets[key] !== 0).map(key => ({ wallet: key, balance: wallets[key] }));
  }, [transactions]);

  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      const matchMonth = d.getMonth().toString() === filterMonth;
      const matchYear = d.getFullYear().toString() === filterYear;
      const matchDay = filterDate ? d.toISOString().split('T')[0] === filterDate : true;
      const matchType = filterType === "all" ? true : (filterType === "income" ? t.amount > 0 : t.amount < 0);
      return matchMonth && matchYear && matchDay && matchType;
    });
  }, [transactions, filterMonth, filterYear, filterDate, filterType]);

  const income = filteredData.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0);
  const expense = filteredData.filter(t => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
  const totalBalance = transactions.reduce((a, b) => a + b.amount, 0);
  const todayExpense = transactions.filter(t => new Date(t.date).toDateString() === new Date().toDateString() && t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
  const isOverBudget = todayExpense > DAILY_LIMIT; 
  const totalFlow = income + expense;
  const inPct = totalFlow ? Math.round((income / totalFlow) * 100) : 0;
  const outPct = totalFlow ? Math.round((expense / totalFlow) * 100) : 0;

  if (!isMounted || loading || !user) return <Flex h="100vh" bg={theme.bg} justify="center" align="center"><Spinner size="xl" color={theme.primary}/></Flex>;

  // --- BOTTOM NAV (FLOATING ISLAND) ---
  const BottomNav = () => (
    <Box position="fixed" bottom="20px" left={0} right={0} zIndex={99} px={4}>
      <Box maxW="md" mx="auto" position="relative">
        <HStack 
          bg={theme.cardBg} h="70px" justify="space-between" px={6}
          borderRadius="2xl" shadow="lg" border="1px solid" borderColor={theme.cardBorder}
          backdropFilter="blur(10px)"
        >
          <HStack spacing={8}>
            <VStack spacing={0} onClick={() => handleTabChange("home")} color={activeTab === "home" ? theme.primary : theme.subText} cursor="pointer" w="40px">
                <Home size={22} strokeWidth={activeTab === "home" ? 2.5 : 2} />
                <Text fontSize="9px" fontWeight={activeTab === "home" ? "bold" : "medium"} mt={1}>Home</Text>
            </VStack>
            <VStack spacing={0} onClick={() => handleTabChange("mutasi")} color={activeTab === "mutasi" ? theme.primary : theme.subText} cursor="pointer" w="40px">
                <History size={22} strokeWidth={activeTab === "mutasi" ? 2.5 : 2} />
                <Text fontSize="9px" fontWeight={activeTab === "mutasi" ? "bold" : "medium"} mt={1}>Mutasi</Text>
            </VStack>
          </HStack>

          <Box w="40px" /> 

          <HStack spacing={8}>
            <VStack spacing={0} onClick={() => handleTabChange("budget")} color={activeTab === "budget" ? theme.primary : theme.subText} cursor="pointer" w="40px">
                <Target size={22} strokeWidth={activeTab === "budget" ? 2.5 : 2} />
                <Text fontSize="9px" fontWeight={activeTab === "budget" ? "bold" : "medium"} mt={1}>Budget</Text>
            </VStack>
            <VStack spacing={0} onClick={() => handleTabChange("profile")} color={activeTab === "profile" ? theme.primary : theme.subText} cursor="pointer" w="40px">
                <User size={22} strokeWidth={activeTab === "profile" ? 2.5 : 2} />
                <Text fontSize="9px" fontWeight={activeTab === "profile" ? "bold" : "medium"} mt={1}>Akun</Text>
            </VStack>
          </HStack>
        </HStack>

        <Box position="absolute" bottom="25px" left="50%" transform="translateX(-50%)" zIndex={100}>
          <IconButton 
            aria-label="Add" icon={<Plus size={28}/>} 
            bgGradient={isDark ? "linear(to-r, #E50914, #B20710)" : "linear(to-r, #E53E3E, #FC8181)"}
            color="white" borderRadius="full" width="56px" height="56px"
            shadow="0px 8px 20px rgba(229, 62, 62, 0.4)" 
            border="4px solid" borderColor={isDark ? "#0F0F0F" : theme.bg} 
            _hover={{ transform: 'scale(1.1)', shadow: "0px 12px 25px rgba(229, 62, 62, 0.6)" }} 
            transition="all 0.3s ease"
            onClick={() => { setActiveTab("home"); setTimeout(() => document.getElementById("input-section")?.scrollIntoView({behavior:'smooth'}), 100); }} 
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box 
        minH="100vh" 
        bg={theme.bg} 
        color={theme.text} 
        pb="100px" 
        fontFamily="var(--font-sans)" 
        position="relative" 
        overflowX="hidden"
        transition="background-color 0.5s ease, color 0.5s ease" // FITUR 3: Animasi Transisi
    >
      
      {/* Background Blobs (tetap sama) */}
      {isDark && (
        <>
          <Box position="fixed" top="-10%" left="-10%" w="500px" h="500px" bg={theme.blob1} borderRadius="full" filter="blur(90px)" opacity={0.4} zIndex={0} animation={`${float1} 12s ease-in-out infinite`} />
          <Box position="fixed" bottom="10%" right="-5%" w="400px" h="400px" bg={theme.blob2} borderRadius="full" filter="blur(90px)" opacity={0.4} zIndex={0} animation={`${float2} 18s ease-in-out infinite`} />
        </>
      )}

      {/* --- TAB 1: BERANDA --- */}
      {activeTab === "home" && (
        <Container maxW="md" pt={6} position="relative" zIndex={1}>
          <Flex justify="space-between" align="center" mb={6}>
            <VStack align="start" spacing={0}>
              <Text fontSize="xs" color={theme.subText}>Halo,</Text>
              <Heading size="md" bgGradient={isDark ? "linear(to-r, white, gray.400)" : "linear(to-r, red.600, red.400)"} bgClip="text">
                {profileName.split(' ')[0]} 
              </Heading>
            </VStack>
            <Avatar name={profileName} bg={theme.primary} color="white" size="sm" />
          </Flex>

          {/* Kartu Total Saldo (FITUR 7: Hide/Show) */}
          <Box bgGradient={theme.homeGradient} color={isDark ? "white" : "white"} p={6} borderRadius="2xl" shadow="xl" mb={6} position="relative" overflow="hidden">
            <Flex justify="space-between" mb={3} zIndex={2} position="relative" align="center">
              <VStack align="start" spacing={0}>
                  <Text fontSize="sm" opacity={0.9} color={!isDark ? "red.900" : "white"}>Total Saldo</Text>
              </VStack>
              <IconButton 
                  aria-label="Toggle Balance"
                  icon={isBalanceHidden ? <EyeOff size={20} /> : <Eye size={20} />}
                  onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                  size="sm"
                  variant="ghost"
                  color={!isDark ? "red.900" : "white"}
                  isRound
              />
            </Flex>
            <Heading size="2xl" mb={1} zIndex={2} position="relative" color={!isDark ? "red.900" : "white"}>
                {isBalanceHidden ? '******' : formatRupiah(totalBalance)}
            </Heading>
            <Text fontSize="xs" opacity={0.8} zIndex={2} position="relative" color={!isDark ? "red.800" : "white"}>TemuCashflow • {user?.email}</Text>
            <Box position="absolute" right="-30px" top="-30px" boxSize="150px" bg="whiteAlpha.200" borderRadius="full" />
          </Box>
          
          {/* Klasifikasi Saldo per Dompet (FITUR 5) */}
          <Heading size="sm" mb={3} color={theme.text}>Saldo per Dompet</Heading>
          <SimpleGrid columns={2} spacing={3} mb={6}>
            {balancePerWallet.map(({ wallet, balance }) => (
                <Card key={wallet} bg={theme.cardBg} borderRadius="xl" shadow="sm" border="1px" borderColor={theme.cardBorder}>
                    <CardBody p={4}>
                        <Flex justify="space-between" align="center" mb={2}>
                            <Badge colorScheme="purple">{wallet}</Badge>
                            <Icon as={WalletCards} color={balance >= 0 ? theme.success : theme.danger} />
                        </Flex>
                        <Text fontWeight="bold" fontSize="md" color={balance >= 0 ? theme.success : theme.danger}>
                            {isBalanceHidden ? '***' : formatRupiah(balance)}
                        </Text>
                    </CardBody>
                </Card>
            ))}
          </SimpleGrid>


          {isOverBudget && (
            <Alert status="error" borderRadius="xl" mb={6} variant="solid" bg={theme.danger}>
                <AlertIcon color="white" />
                <Box><Text fontSize="xs" fontWeight="bold">Peringatan Budget Harian!</Text><Text fontSize="xx-small">Pengeluaran hari ini &gt; Rp 100rb</Text></Box>
            </Alert>
          )}

          <Card id="input-section" bg={theme.cardBg} borderRadius="2xl" shadow="sm" mb={6} border="1px" borderColor={theme.cardBorder}>
            <CardBody>
                <Heading size="sm" mb={4} color={theme.text}>Catat Transaksi</Heading>
                <VStack spacing={3}>
                    <ButtonGroup isAttached w="full" size="sm" variant="outline">
                        <Button w="50%" colorScheme="red" variant={type==="expense"?"solid":"outline"} onClick={()=>setType("expense")}>Keluar</Button>
                        <Button w="50%" colorScheme="green" variant={type==="income"?"solid":"outline"} onClick={()=>setType("income")}>Masuk</Button>
                    </ButtonGroup>
                    <Flex gap={2} w="full">
                        <Select size="sm" borderRadius="lg" value={category} onChange={(e)=>setCategory(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} color={theme.text}>{CATEGORIES.concat(["Nabung"]).map(c => <option key={c} value={c}>{c}</option>)}</Select>
                        <Select size="sm" borderRadius="lg" value={wallet} onChange={(e)=>setWallet(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} color={theme.text}>{WALLETS.map(w => <option key={w} value={w}>{w}</option>)}</Select>
                    </Flex>
                    <Input placeholder="Keterangan (Wajib)" value={text} onChange={(e)=>setText(e.target.value)} size="sm" borderRadius="lg" bg={theme.bg} borderColor={theme.cardBorder} color={theme.text} />
                    <Flex gap={2} w="full">
                        <Input type="number" placeholder="Nominal" value={amount} onChange={(e)=>setAmount(e.target.value)} size="sm" borderRadius="lg" bg={theme.bg} borderColor={theme.cardBorder} color={theme.text} />
                        <Menu>
                            <MenuButton as={IconButton} icon={isScanning ? <Spinner size="xs"/> : (scanSuccess ? <CheckCircle color="green"/> : <Camera size={18}/>)} size="sm" bg={theme.bg} border="1px" borderColor={theme.cardBorder} />
                            <MenuList zIndex={10} bg={theme.cardBg}><MenuItem icon={<Camera size={16}/>} onClick={()=>cameraInputRef.current?.click()} bg={theme.cardBg}>Kamera</MenuItem><MenuItem icon={<ImageIcon size={16}/>} onClick={()=>galleryInputRef.current?.click()} bg={theme.cardBg}>Galeri</MenuItem></MenuList>
                        </Menu>
                        <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="environment" onChange={handleScan}/>
                        <input type="file" ref={galleryInputRef} hidden accept="image/*" onChange={handleScan}/>
                    </Flex>
                    <Button w="full" bg={theme.primary} color="white" size="sm" onClick={handleSaveTransaction} isDisabled={!text || !amount}>Simpan</Button>
                </VStack>
            </CardBody>
          </Card>
        </Container>
      )}

      {/* --- TAB 2: MUTASI --- */}
      {activeTab === "mutasi" && (
        <Container maxW="md" pt={6} position="relative" zIndex={1}>
            <Heading size="lg" mb={4}>Mutasi & Analisis</Heading>
            <Card bg={theme.cardBg} borderRadius="xl" shadow="sm" mb={4} p={3} border="1px" borderColor={theme.cardBorder}>
                <VStack spacing={3}>
                    <ButtonGroup size="sm" isAttached w="full">
                        <Button w="33%" onClick={()=>setFilterType("all")} colorScheme={filterType==="all"?"blue":"gray"}>Semua</Button>
                        <Button w="33%" onClick={()=>setFilterType("income")} colorScheme={filterType==="income"?"green":"gray"}>Masuk</Button>
                        <Button w="33%" onClick={()=>setFilterType("expense")} colorScheme={filterType==="expense"?"red":"gray"}>Keluar</Button>
                    </ButtonGroup>
                    <HStack w="full">
                        <Input type="date" size="xs" value={filterDate} onChange={(e)=>setFilterDate(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} color={theme.text} />
                        <Select size="xs" value={filterMonth} onChange={(e)=>setFilterMonth(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} color={theme.text}>{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"].map((m,i)=>(<option key={i} value={i.toString()}>{m}</option>))}</Select>
                        <Select size="xs" w="70px" value={filterYear} onChange={(e)=>setFilterYear(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} color={theme.text}><option value="2024">2024</option><option value="2025">2025</option></Select>
                    </HStack>
                </VStack>
            </Card>

            <Card bg={theme.cardBg} borderRadius="xl" shadow="sm" mb={4} overflow="hidden" border="1px" borderColor={theme.cardBorder}>
                <CardBody p={3}>
                    <Text fontSize="xs" fontWeight="bold" mb={2}>Analisis Persentase</Text>
                    <HStack spacing={4} mb={3}>
                        <Box flex={1}><Text fontSize="xx-small" color={theme.subText}>Masuk</Text><Progress value={inPct} size="xs" colorScheme="green" borderRadius="full" mb={1}/><Text fontSize="xs" fontWeight="bold">{inPct}%</Text></Box>
                        <Box flex={1}><Text fontSize="xx-small" color={theme.subText}>Keluar</Text><Progress value={outPct} size="xs" colorScheme="red" borderRadius="full" mb={1}/><Text fontSize="xs" fontWeight="bold">{outPct}%</Text></Box>
                    </HStack>
                    <Box h="150px">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{name:'Flow', in:income, out:Math.abs(expense)}]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.subText} opacity={0.2} />
                                <XAxis dataKey="name" hide />
                                <Tooltip contentStyle={{backgroundColor: theme.cardBg}} />
                                <Bar dataKey="in" fill={theme.success} radius={[4,4,0,0]} name="Masuk"/>
                                <Bar dataKey="out" fill={theme.danger} radius={[4,4,0,0]} name="Keluar"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </CardBody>
            </Card>

            <VStack spacing={3} pb={10}>
                {filteredData.map((t) => (
                    <Flex key={t.id} bg={theme.cardBg} p={3} borderRadius="xl" shadow="sm" border="1px" borderColor={theme.cardBorder} justify="space-between" align="center" w="full">
                        <HStack>
                            <VStack align="center" bg={theme.bg} p={1} borderRadius="md" w="40px"><Text fontSize="xs" fontWeight="bold">{new Date(t.date).getDate()}</Text><Text fontSize="xx-small">{new Date(t.date).toLocaleDateString('id-ID',{month:'short'})}</Text></VStack>
                            <VStack align="start" spacing={0}><Text fontWeight="bold" fontSize="sm">{t.text}</Text><HStack spacing={1}><Badge fontSize="xx-small" colorScheme="purple">{t.wallet}</Badge><Badge fontSize="xx-small" colorScheme="gray">{t.category}</Badge></HStack></VStack>
                        </HStack>
                        <VStack align="end" spacing={0}>
                            <Text fontWeight="bold" fontSize="sm" color={t.amount<0?theme.danger:theme.success}>{t.amount>0?"+":""}{formatRupiah(t.amount)}</Text>
                            <IconButton aria-label="del" icon={<Trash2 size={14}/>} size="xs" variant="ghost" colorScheme="red" onClick={()=>handleDeleteTransaction(t.id)} />
                        </VStack>
                    </Flex>
                ))}
            </VStack>
        </Container>
      )}

      {/* --- TAB 3: BUDGET --- */}
      {activeTab === "budget" && (
        <Container maxW="md" pt={6} position="relative" zIndex={1}>
            <Heading size="lg" mb={2}>Budget Plan & Tabungan</Heading>
            <Text fontSize="sm" color={theme.subText} mb={6}>Kelola pos pengeluaran rutin dan tujuan menabung.</Text>
            
            {/* FITUR 1: PENGATURAN REMINDER WA */}
            <Card bg={theme.cardBg} borderRadius="2xl" shadow="sm" mb={6} border="1px" borderColor={theme.cardBorder}>
                <CardBody>
                    <HStack mb={3}><Icon as={Bell} mr={2} boxSize={4} color={theme.primary} /><Text fontSize="sm" fontWeight="bold" color={theme.text}>Pengaturan Reminder WA</Text></HStack>
                    <Text fontSize="xs" mb={3} color={theme.subText}>Atur kapan Anda ingin diingatkan untuk Budget/Nabung setiap bulan. (Warning > Rp300rb akan dikirim *realtime*).</Text>
                    
                    <VStack spacing={3}>
                        <FormControl>
                            <FormLabel fontSize="xs">Tanggal Reminder (1 - 28)</FormLabel>
                            <Input 
                                type="number" 
                                min={1} max={28}
                                value={reminderDay} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val >= 1 && val <= 28) setReminderDay(val.toString());
                                    else if (e.target.value === "") setReminderDay(""); 
                                }} 
                                size="sm" 
                                bg={theme.bg} 
                                borderColor={theme.cardBorder} 
                                color={theme.text}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="xs">Waktu (Jam:Menit)</FormLabel>
                            <Input 
                                type="time" 
                                value={reminderTime} 
                                onChange={(e) => setReminderTime(e.target.value)} 
                                size="sm" 
                                bg={theme.bg} 
                                borderColor={theme.cardBorder} 
                                color={theme.text}
                            />
                        </FormControl>
                        <Button 
                            w="full" 
                            colorScheme="red" 
                            size="sm" 
                            onClick={handleUpdateReminder}
                            isDisabled={!reminderDay || !reminderTime}
                        >
                            Simpan Pengaturan Reminder
                        </Button>
                    </VStack>
                </CardBody>
            </Card>

            {/* Form Budget Plan (tetap sama) */}
            <Card bg={theme.cardBg} borderRadius="2xl" shadow="sm" mb={6} border="1px" borderColor={theme.cardBorder}>
                <CardBody>
                    <Text fontSize="sm" fontWeight="bold" mb={3} color={theme.subText}>Pos Budget Bulanan</Text>
                    <HStack>
                        <Input placeholder="Nama Pos (e.g. Kost)" size="sm" value={budgetName} onChange={(e)=>setBudgetName(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} color={theme.text} />
                        <Input placeholder="Target Rp" type="number" w="100px" size="sm" value={budgetTarget} onChange={(e)=>setBudgetTarget(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} color={theme.text} />
                        <IconButton aria-label="add" icon={<Plus size={18}/>} size="sm" colorScheme="blue" onClick={handleAddBudget} />
                    </HStack>
                </CardBody>
            </Card>
            
            <Heading size="sm" mb={3} color={theme.text}>Pos Pengeluaran</Heading>
            <SimpleGrid columns={2} spacing={4} mb={6}>
                {budgets.map((b) => (
                    <Card key={b.id} bg={theme.cardBg} borderRadius="2xl" shadow="sm" border="1px" borderColor={theme.cardBorder}>
                        <CardBody p={4}>
                            <Flex justify="space-between" mb={2}><Icon as={Wallet} color={theme.primary} /><IconButton aria-label="del" icon={<Trash2 size={14}/>} size="xs" variant="ghost" colorScheme="red" onClick={()=>handleDeleteBudget(b.id)}/></Flex>
                            <Text fontWeight="bold" fontSize="sm" mb={1}>{b.name}</Text>
                            <Text fontSize="xs" color={theme.subText}>Target: {formatRupiah(b.target_amount)}</Text>
                        </CardBody>
                    </Card>
                ))}
            </SimpleGrid>

            <Alert status="info" borderRadius="lg">
                <AlertIcon />
                Untuk fitur menabung (Nabung Cash/E-Wallet), gunakan kategori **'Nabung'** saat mencatat transaksi pengeluaran.
            </Alert>
        </Container>
      )}

      {/* --- TAB 4: PROFILE --- */}
      {activeTab === "profile" && (
        <Container maxW="md" pt={10} position="relative" zIndex={1}>
            <VStack spacing={6}>
                <Avatar size="2xl" name={profileName} bg={theme.primary} />
                <VStack spacing={0}>
                    <HStack>
                        <Heading size="md">{profileName}</Heading>
                        <IconButton 
                            aria-label="Edit Profile" 
                            icon={<Edit2 size={14} />} 
                            size="xs" 
                            isRound 
                            variant="ghost" 
                            onClick={openEditProfile}
                        />
                    </HStack>
                    <Text color={theme.subText}>{user?.email}</Text>
                    <Text fontSize="xs" color={theme.subText}>+{profilePhone}</Text>
                </VStack>
                
                <Card w="full" bg={theme.cardBg} borderRadius="2xl" shadow="sm" border="1px" borderColor={theme.cardBorder}>
                    <CardBody>
                        <Text fontSize="xs" fontWeight="bold" mb={3} color={theme.subText}>EXPORT DATA</Text>
                        <HStack justify="space-around">
                            <VStack onClick={()=>handleExport('pdf')} cursor="pointer"><IconButton aria-label="pdf" icon={<FileText/>} colorScheme="red" variant="outline" isRound /><Text fontSize="xs">PDF</Text></VStack>
                            <VStack onClick={()=>handleExport('excel')} cursor="pointer"><IconButton aria-label="excel" icon={<FileSpreadsheet/>} colorScheme="green" variant="outline" isRound /><Text fontSize="xs">Excel</Text></VStack>
                            <VStack onClick={handleEmailRequest} cursor="pointer"><IconButton aria-label="email" icon={<Mail/>} colorScheme="blue" variant="outline" isRound /><Text fontSize="xs">Email</Text></VStack>
                        </HStack>
                    </CardBody>
                </Card>

                <Card w="full" bg={theme.cardBg} borderRadius="2xl" shadow="sm" border="1px" borderColor={theme.cardBorder}>
                    <CardBody>
                        <VStack spacing={0} divider={<Divider/>}>
                            <Flex w="full" justify="space-between" p={3} align="center"><HStack><Icon as={isDark?Sun:Moon}/><Text fontSize="sm">Mode Gelap</Text></HStack><Switch isChecked={isDark} onChange={(e)=>setIsDark(e.target.checked)} colorScheme="red" /></Flex>
                            <Flex w="full" justify="space-between" p={3} align="center" cursor="pointer" onClick={()=>{setIsChangePinMode(true); setIsPinModalOpen(true);}}><HStack><Icon as={Lock}/><Text fontSize="sm">{hasPin ? 'Ubah PIN Mutasi' : 'Set PIN Mutasi'}</Text></HStack></Flex>
                            <Flex w="full" justify="space-between" p={3} align="center" cursor="pointer" onClick={onOpen}><HStack color="red.500"><Trash2 size={18}/><Text fontSize="sm">Reset Semua Data</Text></HStack></Flex>
                            <Flex w="full" justify="space-between" p={3} align="center" cursor="pointer" onClick={async() => { await supabase.auth.signOut(); router.push('/auth'); }}><HStack color="red.500"><LogOut size={18}/><Text fontSize="sm">Keluar</Text></HStack></Flex>
                        </VStack>
                    </CardBody>
                </Card>
            </VStack>
        </Container>
      )}

      {/* FOOTER COMPONENTS */}
      <BottomNav />

      {/* Modal Edit Profile */}
      <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} isCentered>
        <ModalOverlay backdropFilter="blur(5px)" />
        <ModalContent borderRadius="2xl" bg={theme.cardBg} color={theme.text}>
            <ModalHeader>Ubah Profil</ModalHeader>
            <ModalBody pb={6}>
                <VStack spacing={4}>
                    <FormControl>
                        <FormLabel fontSize="sm">Nama Lengkap</FormLabel>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} />
                    </FormControl>
                    <FormControl>
                        <FormLabel fontSize="sm">Nomor WhatsApp</FormLabel>
                        <InputGroup>
                            <InputLeftAddon bg={theme.bg}>+62</InputLeftAddon>
                            <Input type="number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} bg={theme.bg} borderColor={theme.cardBorder} />
                        </InputGroup>
                    </FormControl>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" mr={3} onClick={() => setIsEditProfileOpen(false)}>Batal</Button>
                <Button colorScheme="red" onClick={handleUpdateProfile}>Simpan</Button>
            </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal PIN */}
      <Modal isOpen={isPinModalOpen} onClose={() => {setIsPinModalOpen(false); setIsChangePinMode(false);}} isCentered size="xs">
        <ModalOverlay backdropFilter="blur(5px)" />
        <ModalContent borderRadius="2xl" bg={theme.cardBg} color={theme.text}>
            <ModalHeader textAlign="center">
                {isChangePinMode 
                    ? (hasPin ? "Masukkan PIN Lama" : "Buat PIN Baru") 
                    : (hasPin ? "Masukkan PIN Mutasi" : "Set PIN Pertama")}
            </ModalHeader>
            <ModalBody pb={6} display="flex" justifyContent="center">
                <HStack><PinInput value={pinInput} onChange={setPinInput} onComplete={verifyPin} type="alphanumeric" mask><PinInputField bg={theme.bg} borderColor={theme.cardBorder} /><PinInputField bg={theme.bg} borderColor={theme.cardBorder} /><PinInputField bg={theme.bg} borderColor={theme.cardBorder} /><PinInputField bg={theme.bg} borderColor={theme.cardBorder} /><PinInputField bg={theme.bg} borderColor={theme.cardBorder} /><PinInputField bg={theme.bg} borderColor={theme.cardBorder} /></PinInput></HStack>
            </ModalBody>
            <ModalFooter justifyContent="center" pt={0}>
                {!hasPin && <Text fontSize="xs" color={theme.subText}>Wajib PIN 6 digit untuk keamanan Mutasi</Text>}
            </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Alert Dialog */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent m={4} borderRadius="xl" bg={theme.cardBg} color={theme.text}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Hapus Semua Data?</AlertDialogHeader>
            <AlertDialogBody>Tindakan ini tidak dapat dibatalkan.</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} size="sm" variant="ghost" color={theme.text}>Batal</Button>
              <Button colorScheme="red" onClick={handleReset} ml={3} size="sm">Hapus</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

    </Box>
  );
}