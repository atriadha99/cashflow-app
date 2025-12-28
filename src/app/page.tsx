"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Heading, Text, VStack, HStack, Input, Button,
  Card, CardBody, IconButton, Flex, Icon, Spinner, ButtonGroup, Select, SimpleGrid,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure,
  Badge, Progress, Avatar, Divider, Switch, Menu, MenuButton, MenuList, MenuItem, Alert, AlertIcon,
  useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, PinInput, PinInputField, FormControl, FormLabel, InputGroup, InputLeftAddon,
  Stat, StatLabel, StatNumber
} from "@chakra-ui/react";
import {
  Home, History, Target, User, Trash2, Plus, WalletCards,
  Camera, LogOut, Sun, Moon, CheckCircle, Wallet, Image as ImageIcon,
  FileText, FileSpreadsheet, Lock, Mail, Edit2, Phone, Eye, EyeOff, Bell,
  TrendingUp, TrendingDown, LayoutDashboard, PieChart as PieIcon,
  Sparkles, AlertCircle
} from "lucide-react";
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/lib/supabase";
import { formatRupiah, parseAmount, resizeImage } from "@/utils/helpers";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import bcrypt from "bcryptjs";

const CATEGORY_MAP = [
  { name: "Makan", color: "#0D9488" }, { name: "Transport", color: "#0284C7" },
  { name: "Belanja", color: "#7C3AED" }, { name: "Tagihan", color: "#EA580C" },
  { name: "Hiburan", color: "#DB2777" }, { name: "Gaji", color: "#059669" },
  { name: "Nabung", color: "#0891B2" }, { name: "Lainnya", color: "#4B5563" },
  { name: "Jajan", color: "#E11D48" },
];

const CATEGORIES = CATEGORY_MAP.map(c => c.name);
const WALLETS = ["Tunai", "QRIS", "Debit", "Credit Card", "Gopay", "ShopeePay", "OVO", "Dana"];
const DAILY_LIMIT = 300000;

export default function SuperApp() {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<"home" | "mutasi" | "profile">("home");
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  // Profile & PIN
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [userPinHash, setUserPinHash] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // PIN Modal
  const [isChangePinMode, setIsChangePinMode] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [isMutasiUnlocked, setIsMutasiUnlocked] = useState(false);

  // Form & Data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Lainnya");
  const [wallet, setWallet] = useState("Tunai");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Theme
  const theme = {
    bg: isDark ? "#0F172A" : "#F1F5F9",
    cardBg: isDark ? "#1E293B" : "#FFFFFF",
    text: isDark ? "#F8FAFC" : "#1E293B",
    subText: isDark ? "#94A3B8" : "#64748B",
    primary: "#0891B2",
    success: "#10B981",
    danger: "#F43F5E",
    border: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
    gradient: "linear(to-br, #0891B2, #0369A1)"
  };

  // --- DATA FETCHING ---
  const initData = useCallback(async (userId: string) => {
    const [profileRes, transRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    ]);
    if (profileRes.data) {
      setProfileName(profileRes.data.full_name || "User");
      setProfilePhone(profileRes.data.phone || "");
      setUserPinHash(profileRes.data.pin_hash);
      setHasPin(!!profileRes.data.pin_hash);
    }
    if (transRes.data) setTransactions(transRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/auth");
      setUser(session.user);
      initData(session.user.id);
    };
    checkUser();
  }, [router, initData]);

  // --- HANDLERS ---
  const handleSave = async () => {
    if (!text || !amount) return toast({ title: "Isi semua field", status: "warning" });
    const val = parseAmount(amount);

    // 💰 DAILY LIMIT CHECK
    const todayExp = transactions
      .filter(t => t.amount < 0 && new Date(t.created_at).toDateString() === new Date().toDateString())
      .reduce((a, b) => a + Math.abs(b.amount), 0);

    if (type === "expense" && (todayExp + val) > DAILY_LIMIT) {
      toast({ title: "Limit Tercapai!", description: `Batas harian: ${formatRupiah(DAILY_LIMIT)}`, status: "error" });
      return;
    }

    const finalAmount = type === "expense" ? -val : val;
    const { data, error } = await supabase.from('transactions').insert([{
      text, amount: finalAmount, category, wallet, user_id: user.id
    }]).select();

    if (!error && data) {
      setTransactions([data[0], ...transactions]);
      setText(""); setAmount(""); setScanSuccess(false);
      toast({ title: "Tersimpan", status: "success" });
    }
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
      const base64 = await resizeImage(file);
      const res = await fetch("/api/scan", { method: "POST", body: JSON.stringify({ imageBase64: base64 }) });
      const data = await res.json();
      setAmount(data.nominal.toString());
      setText(data.keterangan);
      setCategory(data.kategori);
      setScanSuccess(true);
      toast({ title: "Struk Terbaca", status: "success" });
    } catch { toast({ title: "Gagal Scan", status: "error" }); }
    finally { setIsScanning(false); }
  };

  // --- Tambahkan Fungsi Ini ---
  const handleUpdateProfile = async () => {
    // Validasi input
    if (!editName || !editPhone) {
      return toast({ 
        title: "Peringatan", 
        description: "Nama dan Nomor WA wajib diisi", 
        status: "warning" 
      });
    }

    try {
      // Update data ke tabel 'profiles' di Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editName, 
          phone: editPhone 
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update state lokal untuk sinkronisasi UI
      setProfileName(editName);
      setProfilePhone(editPhone);
      
      // Tutup modal setelah berhasil
      setIsEditProfileOpen(false);

      toast({ 
        title: "Berhasil", 
        description: "Profil Anda telah diperbarui", 
        status: "success" 
      });
    } catch (err: any) {
      toast({ 
        title: "Gagal Update", 
        description: err.message, 
        status: "error" 
      });
    }
  };

  const verifyOrSetPin = async () => {
    if (pinInput.length !== 6) return;
    if (!hasPin || isChangePinMode) {
      const hash = await bcrypt.hash(pinInput, 10);
      await supabase.from('profiles').update({ pin_hash: hash }).eq('id', user.id);
      setUserPinHash(hash); setHasPin(true); setIsChangePinMode(false);
      setIsPinModalOpen(false); toast({ title: "PIN Disimpan", status: "success" });
    } else {
      const isValid = await bcrypt.compare(pinInput, userPinHash || "");
      if (isValid) { setIsMutasiUnlocked(true); setActiveTab("mutasi"); setIsPinModalOpen(false); }
      else { toast({ title: "PIN Salah", status: "error" }); }
    }
    setPinInput("");
  };

  // --- EXPORT LOGIC ---
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mutasi Temu Cashflow", 14, 10);
    autoTable(doc, {
      startY: 20,
      head: [["Tanggal", "Keterangan", "Kategori", "Wallet", "Nominal"]],
      body: transactions.map(t => [new Date(t.created_at).toLocaleDateString(), t.text, t.category, t.wallet, formatRupiah(t.amount)])
    });
    doc.save("mutasi-cashflow.pdf");
  };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Mutasi");
    ws.columns = [
      { header: "Tanggal", key: "date", width: 15 },
      { header: "Keterangan", key: "text", width: 25 },
      { header: "Kategori", key: "cat", width: 15 },
      { header: "Nominal", key: "amt", width: 15 }
    ];
    transactions.forEach(t => ws.addRow({ date: new Date(t.created_at).toLocaleDateString(), text: t.text, cat: t.category, amt: t.amount }));
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "mutasi-cashflow.xlsx");
  };

  // --- CALCULATIONS ---
  const summary = useMemo(() => {
    const inc = transactions.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0);
    const exp = transactions.filter(t => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
    return { inc, exp, net: inc - exp };
  }, [transactions]);

  if (!isMounted || loading) return <Flex h="100vh" bg={theme.bg} align="center" justify="center"><Spinner color={theme.primary} /></Flex>;

  return (
    <Box minH="100vh" bg={theme.bg} color={theme.text} pb="100px">
      <Container maxW="md" pt={6}>
        
        {/* HEADER */}
        <Flex justify="space-between" align="center" mb={6}>
          <HStack spacing={4}>
            <Avatar size="sm" name={profileName} bg={theme.primary} />
            <Text fontWeight="bold">{profileName}</Text>
          </HStack>
          <IconButton icon={isDark ? <Sun /> : <Moon />} onClick={() => setIsDark(!isDark)} bg={theme.cardBg} isRound aria-label="darkmode" />
        </Flex>

        {activeTab === "home" && (
          <VStack spacing={5} align="stretch">
            <Card bg={theme.primary} color="white" borderRadius="3xl" bgGradient={theme.gradient}>
              <CardBody>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Net Balance</Text>
                  <IconButton variant="ghost" color="white" icon={isBalanceHidden ? <EyeOff /> : <Eye />} onClick={() => setIsBalanceHidden(!isBalanceHidden)} aria-label="hide" />
                </HStack>
                <Heading size="xl" mb={4}>{isBalanceHidden ? "••••••" : formatRupiah(summary.net)}</Heading>
                <SimpleGrid columns={2} spacing={4}>
                  <Stat><StatLabel fontSize="xs">Income</StatLabel><StatNumber fontSize="sm">+{formatRupiah(summary.inc)}</StatNumber></Stat>
                  <Stat><StatLabel fontSize="xs">Expense</StatLabel><StatNumber fontSize="sm">-{formatRupiah(summary.exp)}</StatNumber></Stat>
                </SimpleGrid>
              </CardBody>
            </Card>

            <Card bg={theme.cardBg} borderRadius="2xl" border="1px" borderColor={theme.border}>
              <CardBody>
                <VStack spacing={4}>
                  <ButtonGroup isAttached w="full" size="sm">
                    <Button w="full" onClick={() => setType("expense")} bg={type === "expense" ? theme.danger : "gray.100"} color={type === "expense" ? "white" : "black"}>Expense</Button>
                    <Button w="full" onClick={() => setType("income")} bg={type === "income" ? theme.success : "gray.100"} color={type === "income" ? "white" : "black"}>Income</Button>
                  </ButtonGroup>
                  <Input placeholder="Keterangan" variant="filled" value={text} onChange={e => setText(e.target.value)} />
                  <HStack w="full">
                    <Input placeholder="Nominal" type="number" variant="filled" value={amount} onChange={e => setAmount(e.target.value)} />
                    <Menu>
                      <MenuButton as={IconButton} icon={isScanning ? <Spinner size="xs"/> : <Camera/>} />
                      <MenuList bg={theme.cardBg}>
                        <MenuItem onClick={() => cameraInputRef.current?.click()}>Kamera</MenuItem>
                        <MenuItem onClick={() => galleryInputRef.current?.click()}>Galeri</MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                  <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="environment" onChange={handleScan} />
                  <input type="file" ref={galleryInputRef} hidden accept="image/*" onChange={handleScan} />
                  <Button w="full" bg={theme.primary} color="white" onClick={handleSave}>Simpan Transaksi</Button>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        )}

        {activeTab === "mutasi" && (
          <VStack spacing={4} align="stretch">
            <Heading size="sm">Riwayat</Heading>
            {transactions.map(t => (
              <Card key={t.id} bg={theme.cardBg} borderRadius="xl" border="1px" borderColor={theme.border}>
                <CardBody p={3}>
                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="sm">{t.text}</Text>
                      <Text fontSize="xs" color={theme.subText}>{t.category}</Text>
                    </VStack>
                    <HStack>
                      <Text fontWeight="bold" color={t.amount > 0 ? theme.success : theme.danger}>{formatRupiah(t.amount)}</Text>
                      <IconButton icon={<Trash2 size={14}/>} size="xs" variant="ghost" colorScheme="red" onClick={async () => {
                        await supabase.from("transactions").delete().eq("id", t.id);
                        setTransactions(transactions.filter(x => x.id !== t.id));
                      }} aria-label="del" />
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}

        {activeTab === "profile" && (
          <VStack spacing={4} align="stretch">
            <Card bg={theme.cardBg} p={6} borderRadius="3xl" border="1px" borderColor={theme.border}>
              <VStack spacing={4}>
                <Avatar size="xl" name={profileName} bg={theme.primary} color="white" />
                <Button size="sm" leftIcon={<Edit2/>} onClick={() => setIsEditProfileOpen(true)}>Edit Profil</Button>
              </VStack>
            </Card>
            <Card bg={theme.cardBg} borderRadius="2xl" overflow="hidden" border="1px" borderColor={theme.border}>
              <VStack spacing={0} align="stretch">
                <Button h="60px" borderRadius={0} leftIcon={<FileText />} onClick={exportPDF}>Export PDF</Button>
                <Button h="60px" borderRadius={0} leftIcon={<FileSpreadsheet />} onClick={exportExcel}>Export Excel</Button>
                <Button h="60px" borderRadius={0} leftIcon={<Lock />} onClick={() => { setIsChangePinMode(true); setIsPinModalOpen(true); }}>Ganti PIN</Button>
                <Button h="60px" borderRadius={0} leftIcon={<LogOut />} colorScheme="red" onClick={() => supabase.auth.signOut()}>Logout</Button>
              </VStack>
            </Card>
          </VStack>
        )}
      </Container>

      {/* FOOTER NAV */}
      <Box position="fixed" bottom="20px" left={0} right={0} px={6} zIndex={100}>
        <HStack maxW="md" mx="auto" bg={theme.cardBg} h="70px" justify="space-around" borderRadius="2xl" shadow="2xl" border="1px" borderColor={theme.border} backdropFilter="blur(15px)">
          <VStack cursor="pointer" onClick={() => setActiveTab("home")} color={activeTab === "home" ? theme.primary : theme.subText}>
            <LayoutDashboard size={20} /><Text fontSize="10px">Utama</Text>
          </VStack>
          <VStack cursor="pointer" onClick={() => (isMutasiUnlocked ? setActiveTab("mutasi") : setIsPinModalOpen(true))} color={activeTab === "mutasi" ? theme.primary : theme.subText}>
            <History size={20} /><Text fontSize="10px">Mutasi</Text>
          </VStack>
          <VStack cursor="pointer" onClick={() => setActiveTab("profile")} color={activeTab === "profile" ? theme.primary : theme.subText}>
            <User size={20} /><Text fontSize="10px">Profil</Text>
          </VStack>
        </HStack>
      </Box>

      {/* MODAL EDIT PROFIL */}
      <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent bg={theme.cardBg} color={theme.text}>
          <ModalHeader>Edit Profile</ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl><FormLabel>Nama</FormLabel><Input value={editName} onChange={e => setEditName(e.target.value)} /></FormControl>
              <FormControl><FormLabel>WA</FormLabel><Input value={editPhone} onChange={e => setEditPhone(e.target.value)} /></FormControl>
              <Button w="full" colorScheme="blue" onClick={handleUpdateProfile}>Update</Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* MODAL PIN */}
      <Modal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} isCentered size="xs">
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent bg={theme.cardBg} color={theme.text}>
          <ModalHeader textAlign="center">{isChangePinMode ? "Set PIN Baru" : "Buka Mutasi"}</ModalHeader>
          <ModalBody pb={8}>
            <HStack justify="center">
              <PinInput value={pinInput} onChange={setPinInput} onComplete={verifyOrSetPin} mask>
                <PinInputField /><PinInputField /><PinInputField /><PinInputField /><PinInputField /><PinInputField />
              </PinInput>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}