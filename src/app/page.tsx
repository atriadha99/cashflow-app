"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Heading, Text, VStack, HStack, Input, Button,
  Card, CardBody, IconButton, Stat, StatLabel, StatNumber,
  useToast, Flex, Icon, Spinner, ButtonGroup
} from "@chakra-ui/react";
// Satu import saja untuk semua icon
import { 
  Trash2, Plus, WalletCards, ArrowUpRight, ArrowDownRight, 
  Sparkles, Camera, LogOut, User 
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/lib/supabase";

interface Transaction {
  id: number;
  text: string;
  amount: number;
  date: string;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense"); // Default Pengeluaran
  
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  // --- CEK LOGIN ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
      } else {
        fetchTransactions();
      }
    };
    checkUser();
  }, [router]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const saveTransaction = async (newTx: { text: string, amount: number, date: string }) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([newTx])
        .select();

      if (error) throw error;

      if (data) {
        setTransactions([data[0], ...transactions]);
        toast({ title: "Tersimpan!", status: "success", duration: 1000 });
      }
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, status: "error" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || !amount) {
      toast({ title: "Isi data dulu", status: "warning" });
      return;
    }

    // LOGIKA: Jika Expense -> Negatif, Jika Income -> Positif
    let nominal = Math.abs(Number(amount)); 
    if (type === "expense") {
      nominal = nominal * -1;
    }

    const newTx = {
      text,
      amount: nominal,
      date: new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }),
    };

    await saveTransaction(newTx);
    setText("");
    setAmount("");
  };

  const deleteTransaction = async (id: number) => {
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  // --- SCAN FITUR ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    toast({ title: "Menganalisis Struk...", status: "info" });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result;
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        setText(data.text || "Struk Scan");
        setType("expense"); // Default scan = pengeluaran
        setAmount(Math.abs(Number(data.amount)).toString());
        
        setIsScanning(false);
      };
    } catch (error) {
      toast({ title: "Gagal Scan", status: "error" });
      setIsScanning(false);
    }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

  const amounts = transactions.map((t) => t.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0);
  const income = amounts.filter((item) => item > 0).reduce((acc, item) => (acc += item), 0);
  const expense = (amounts.filter((item) => item < 0).reduce((acc, item) => (acc += item), 0) * -1);

  const chartData = [{ name: "Masuk", value: income }, { name: "Keluar", value: expense }];
  const COLORS = ["#34d399", "#f87171"]; 
  const glassStyle = { bg: "whiteAlpha.900", backdropFilter: "blur(12px)", border: "1px solid", borderColor: "whiteAlpha.400", borderRadius: "2xl", boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.05)" };

  if (isLoading) {
    return <Flex h="100vh" justify="center" align="center"><Spinner size="xl" color="purple.500"/></Flex>;
  }

  return (
    <Box minH="100vh" bg="#F3F4F6" position="relative" overflowX="hidden" fontFamily="var(--font-sans)">
      <Box position="fixed" top="-10%" left="-10%" w="500px" h="500px" bg="purple.300" borderRadius="full" filter="blur(90px)" opacity={0.4} zIndex={0} />
      <Box position="fixed" bottom="10%" right="-5%" w="400px" h="400px" bg="blue.300" borderRadius="full" filter="blur(90px)" opacity={0.4} zIndex={0} />

      <Container maxW="md" position="relative" zIndex={1} py={6}>
        <VStack spacing={5} align="stretch">
          
          {/* HEADER DENGAN TOMBOL PROFILE & LOGOUT */}
          <Flex justify="space-between" align="center" px={2}>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="bold">WELCOME BACK</Text>
              <Heading size="md" color="gray.800">CashFlow App ✨</Heading>
            </Box>
            
            <HStack>
              {/* Tombol Profile */}
              <IconButton 
                aria-label="Profile" 
                icon={<Icon as={User} size={20} />}
                bg="white"
                shadow="sm"
                color="gray.600" 
                borderRadius="xl"
                onClick={() => router.push("/profile")}
              />
              
              {/* Tombol Logout */}
              <IconButton 
                aria-label="Logout" 
                icon={<Icon as={LogOut} size={20}/>} 
                colorScheme="red" 
                variant="ghost" 
                onClick={handleLogout}
              />
            </HStack>
          </Flex>

          {/* KARTU SALDO UTAMA */}
          <Box bgGradient="linear(to-br, #667eea, #764ba2)" color="white" p={8} borderRadius="3xl" boxShadow="2xl" position="relative" overflow="hidden">
            <VStack align="start" spacing={1} position="relative" zIndex={2}>
              <HStack color="whiteAlpha.800"><WalletCards size={18} /><Text fontSize="sm" fontWeight="medium">Saldo Saat Ini</Text></HStack>
              <Heading size="3xl" letterSpacing="tight">{formatRupiah(total)}</Heading>
            </VStack>
            <Box position="absolute" right="-20px" top="-20px" boxSize="150px" bg="whiteAlpha.200" borderRadius="full" />
          </Box>

          {/* RINGKASAN PEMASUKAN / PENGELUARAN */}
          <HStack spacing={3}>
            <Card flex={1} {...glassStyle}><CardBody p={3}><Stat><HStack mb={1}><ArrowDownRight size={16} color="#10b981" /><StatLabel fontSize="xs">Pemasukan</StatLabel></HStack><StatNumber fontSize="md" color="green.600">{formatRupiah(income)}</StatNumber></Stat></CardBody></Card>
            <Card flex={1} {...glassStyle}><CardBody p={3}><Stat><HStack mb={1}><ArrowUpRight size={16} color="#ef4444" /><StatLabel fontSize="xs">Pengeluaran</StatLabel></HStack><StatNumber fontSize="md" color="red.600">{formatRupiah(expense)}</StatNumber></Stat></CardBody></Card>
          </HStack>

          {/* GRAFIK (Hanya muncul jika ada data) */}
          {(income > 0 || expense > 0) && (
            <Card {...glassStyle}>
              <CardBody display="flex" alignItems="center" justifyContent="space-between" p={4}>
                <Box>
                  <Heading size="sm" mb={1} color="gray.700">Analisis</Heading>
                  <Text fontSize="xs" color="gray.500">Cash Flow Bulan Ini</Text>
                </Box>
                <Box h="80px" w="80px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={25} outerRadius={35} paddingAngle={5} dataKey="value">
                        {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
          )}

          {/* FORM TAMBAH TRANSAKSI */}
          <Card {...glassStyle} border="none" bg="white">
            <CardBody>
              <Heading size="sm" mb={4} color="gray.700">Tambah Transaksi</Heading>
              
              {/* Toggle Tombol */}
              <ButtonGroup isAttached w="full" mb={4} variant="outline">
                <Button 
                  w="50%" 
                  colorScheme="red" 
                  variant={type === "expense" ? "solid" : "outline"}
                  onClick={() => setType("expense")}
                >
                  Pengeluaran
                </Button>
                <Button 
                  w="50%" 
                  colorScheme="green" 
                  variant={type === "income" ? "solid" : "outline"}
                  onClick={() => setType("income")}
                >
                  Pemasukan
                </Button>
              </ButtonGroup>

              {/* Tombol Scan */}
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
              <Button w="full" mb={4} variant="ghost" colorScheme="purple" leftIcon={isScanning ? <Spinner size="sm" /> : <Camera size={18} />} onClick={() => fileInputRef.current?.click()} isDisabled={isScanning} borderStyle="dashed" borderWidth="2px">
                Scan Struk (AI)
              </Button>

              {/* Input Form Manual */}
              <form onSubmit={handleSubmit}>
                <HStack spacing={3}>
                  <Input placeholder="Ket..." value={text} onChange={(e) => setText(e.target.value)} bg="gray.50" borderRadius="xl" />
                  <Input type="number" placeholder="Rp..." w="110px" value={amount} onChange={(e) => setAmount(e.target.value)} bg="gray.50" borderRadius="xl" />
                </HStack>
                <Button 
                  mt={3} 
                  type="submit" 
                  w="full" 
                  colorScheme={type === "expense" ? "red" : "green"} 
                  borderRadius="xl" 
                  leftIcon={<Plus size={18} />} 
                  h="45px"
                >
                  Simpan {type === "expense" ? "Pengeluaran" : "Pemasukan"}
                </Button>
              </form>
            </CardBody>
          </Card>

          {/* DAFTAR RIWAYAT */}
          <Box pb={10}>
            <Heading size="sm" mb={3} px={1} color="gray.600">Riwayat ({transactions.length})</Heading>
            <VStack spacing={3} align="stretch">
              {transactions.map((t) => (
                <Flex key={t.id} bg="white" p={4} borderRadius="2xl" boxShadow="sm" justify="space-between" align="center">
                  <HStack spacing={3}>
                    <Box p={2} bg={t.amount < 0 ? "red.50" : "green.50"} borderRadius="lg" color={t.amount < 0 ? "red.500" : "green.500"}>
                        {t.amount < 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </Box>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color="gray.700">{t.text}</Text>
                      <Text fontSize="xs" color="gray.400">{t.date}</Text>
                    </Box>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold" fontSize="sm" color={t.amount < 0 ? "red.500" : "green.600"}>
                      {t.amount < 0 ? "-" : "+"} {formatRupiah(Math.abs(t.amount))}
                    </Text>
                    <IconButton aria-label="Del" icon={<Trash2 size={16} />} size="xs" variant="ghost" colorScheme="gray" onClick={() => deleteTransaction(t.id)} />
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}