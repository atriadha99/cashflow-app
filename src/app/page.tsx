"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Heading, Text, VStack, HStack, Input, Button,
  Card, CardBody, IconButton, Stat, StatLabel, StatNumber,
  Flex, Icon, Spinner, ButtonGroup, Select, SimpleGrid,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure,
  Badge, Divider, Progress
} from "@chakra-ui/react";
import { 
  Trash2, Plus, WalletCards, ArrowUpRight, ArrowDownRight, 
  Camera, LogOut, User, Zap, TrendingUp
} from "lucide-react";
// Import Hooks & Utils Modular
import { useTransactions } from "@/hooks/useTransactions";
import { formatRupiah, parseAmount, detectCategory, calculateForecast } from "@/utils/helpers";
import { supabase } from "@/lib/supabase";

const CATEGORIES = ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Gaji", "Lainnya"];
const WALLETS = ["Tunai", "BCA", "Mandiri", "Gopay", "OVO", "Dana"];

export default function Home() {
  const { transactions, loading, user, addTransaction, deleteTransaction, resetData } = useTransactions();
  const router = useRouter();
  
  // Local UI States
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Lainnya");
  const [wallet, setWallet] = useState("Tunai");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [isScanning, setIsScanning] = useState(false);
  
  // Filter States
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Redirect jika belum login ---
  if (!loading && !user) {
    router.push("/auth");
    return null;
  }

  // --- Derived State (Analisis) ---
  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });
  }, [transactions, filterMonth, filterYear]);

  const income = filteredData.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0);
  const expense = filteredData.filter(t => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
  const totalBalance = transactions.reduce((a, b) => a + b.amount, 0);
  
  // Forecast Data
  const forecast = useMemo(() => calculateForecast(filteredData), [filteredData]);

  // --- Handlers ---
  const handleSave = async () => {
    if (!text || !amount) return;
    
    let nominal = parseAmount(amount);
    if (type === "expense") nominal = -Math.abs(nominal);
    else nominal = Math.abs(nominal);

    await addTransaction({
      text,
      amount: nominal,
      category,
      wallet
    });

    setText("");
    setAmount("");
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);

    try {
        // Resize logic here (singkat saja krn di page sebelumnya sudah ada)
        // ... anggaplah sudah compress ...
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (ev) => {
            const base64 = ev.target?.result;
            const res = await fetch("/api/scan", {
                method: "POST", 
                body: JSON.stringify({ imageBase64: base64 })
            });
            const data = await res.json();
            
            setText(data.text || "Scan Result");
            const detectedNominal = Math.abs(Number(data.amount) || 0);
            setAmount(detectedNominal.toString());
            setType("expense");
            
            // Auto Detect Category dari text hasil scan
            const autoCat = detectCategory(data.text || "");
            setCategory(autoCat);
            
            setIsScanning(false);
        };
    } catch (err) {
        setIsScanning(false);
    }
  };

  if (loading) return <Flex h="100vh" justify="center" align="center"><Spinner size="xl" color="purple.500" /></Flex>;

  return (
    <Box minH="100vh" bg="#F8FAFC" position="relative" pb={20}>
      {/* Abstract Background */}
      <Box position="absolute" top={0} left={0} right={0} h="250px" bgGradient="linear(to-br, purple.600, blue.600)" borderBottomRadius="3xl" zIndex={0} />

      <Container maxW="md" position="relative" zIndex={1} pt={8}>
        <VStack spacing={5} align="stretch">
          
          {/* Top Bar */}
          <Flex justify="space-between" align="center" color="white">
            <Box>
              <Text fontSize="xs" opacity={0.8}>Total Balance</Text>
              <Heading size="lg">{formatRupiah(totalBalance)}</Heading>
            </Box>
            <HStack>
                <IconButton icon={<Trash2 size={18}/>} aria-label="reset" variant="ghost" color="white" _hover={{bg:'whiteAlpha.200'}} onClick={onOpen} />
                <IconButton icon={<User size={18}/>} aria-label="profile" variant="ghost" color="white" _hover={{bg:'whiteAlpha.200'}} onClick={() => router.push('/profile')} />
                <IconButton icon={<LogOut size={18}/>} aria-label="logout" variant="ghost" color="white" _hover={{bg:'whiteAlpha.200'}} onClick={async() => { await supabase.auth.signOut(); router.push('/auth'); }} />
            </HStack>
          </Flex>

          {/* Cards Summary */}
          <HStack spacing={3} mt={2}>
            <Card flex={1} borderRadius="2xl" boxShadow="lg">
                <CardBody p={3}>
                    <HStack mb={1} color="green.500"><ArrowDownRight size={16}/><Text fontSize="xs" fontWeight="bold">INCOME</Text></HStack>
                    <Text fontWeight="bold" fontSize="md">{formatRupiah(income)}</Text>
                </CardBody>
            </Card>
            <Card flex={1} borderRadius="2xl" boxShadow="lg">
                <CardBody p={3}>
                    <HStack mb={1} color="red.500"><ArrowUpRight size={16}/><Text fontSize="xs" fontWeight="bold">EXPENSE</Text></HStack>
                    <Text fontWeight="bold" fontSize="md">{formatRupiah(expense)}</Text>
                </CardBody>
            </Card>
          </HStack>

          {/* AI FORECAST CARD (NEW Feature) */}
          {(expense > 0) && (
            <Card borderRadius="2xl" bgGradient="linear(to-r, gray.800, gray.900)" color="white" boxShadow="lg">
                <CardBody p={4}>
                    <Flex justify="space-between" align="center" mb={2}>
                        <HStack><Zap size={16} color="#F6E05E" /><Text fontSize="sm" fontWeight="bold">Spending Insight</Text></HStack>
                        <Badge colorScheme="yellow" variant="solid" fontSize="xx-small">AI BETA</Badge>
                    </Flex>
                    <Text fontSize="xs" opacity={0.8} mb={1}>Rata-rata pengeluaran harianmu:</Text>
                    <Heading size="md" color="yellow.300" mb={3}>{formatRupiah(forecast.dailyAvg)} <span style={{fontSize:10, color:'white'}}>/ hari</span></Heading>
                    
                    <Box w="full" bg="whiteAlpha.200" borderRadius="full" h={1.5} mb={2}>
                        <Box w="40%" h="full" bg="yellow.400" borderRadius="full" />
                    </Box>
                    <Text fontSize="xs" fontStyle="italic" opacity={0.6}>
                        Prediksi bulan depan: {formatRupiah(forecast.nextMonthPrediction)}
                    </Text>
                </CardBody>
            </Card>
          )}

          {/* INPUT SECTION */}
          <Box bg="white" p={4} borderRadius="2xl" boxShadow="sm">
            <Heading size="sm" mb={4} color="gray.700">Transaksi Baru</Heading>
            <VStack spacing={3}>
                <ButtonGroup isAttached w="full" size="sm" variant="outline">
                    <Button w="50%" colorScheme="red" variant={type==="expense"?"solid":"outline"} onClick={()=>setType("expense")}>Keluar</Button>
                    <Button w="50%" colorScheme="green" variant={type==="income"?"solid":"outline"} onClick={()=>setType("income")}>Masuk</Button>
                </ButtonGroup>
                
                <Flex gap={2} w="full">
                    <Select size="sm" borderRadius="lg" value={category} onChange={(e)=>setCategory(e.target.value)}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                    <Select size="sm" borderRadius="lg" value={wallet} onChange={(e)=>setWallet(e.target.value)}>
                        {WALLETS.map(w => <option key={w} value={w}>{w}</option>)}
                    </Select>
                </Flex>

                <Input placeholder="Keterangan..." value={text} onChange={(e)=>setText(e.target.value)} size="sm" borderRadius="lg" />
                
                <Flex gap={2} w="full">
                    <Input type="number" placeholder="Rp..." value={amount} onChange={(e)=>setAmount(e.target.value)} size="sm" borderRadius="lg" />
                    <IconButton aria-label="Scan" icon={isScanning ? <Spinner size="xs"/> : <Camera size={16}/>} size="sm" onClick={() => fileInputRef.current?.click()} />
                    <input type="file" ref={fileInputRef} hidden onChange={handleScan} accept="image/*"/>
                </Flex>

                <Button w="full" colorScheme="purple" size="sm" onClick={handleSave}>Simpan Transaksi</Button>
            </VStack>
          </Box>

          {/* LIST TRANSAKSI */}
          <Box pb={10}>
            <HStack justify="space-between" mb={3}>
                <Heading size="sm" color="gray.600">Riwayat</Heading>
                <Select w="120px" size="xs" value={filterMonth} onChange={(e)=>setFilterMonth(parseInt(e.target.value))}>
                    {["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"].map((m,i)=>(<option key={i} value={i}>{m}</option>))}
                </Select>
            </HStack>

            <VStack spacing={3} align="stretch">
                {filteredData.length === 0 ? <Text textAlign="center" fontSize="sm" color="gray.400" py={4}>Belum ada data bulan ini.</Text> : 
                 filteredData.map((t) => (
                    <Flex key={t.id} bg="white" p={3} borderRadius="xl" boxShadow="sm" justify="space-between" align="center">
                        <HStack>
                            <Box p={2} bg={t.amount<0?"red.50":"green.50"} borderRadius="lg">
                                {t.amount<0 ? <TrendingUp size={16} color="#F56565" style={{transform:'scaleY(-1)'}}/> : <TrendingUp size={16} color="#48BB78"/>}
                            </Box>
                            <Box>
                                <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{t.text}</Text>
                                <HStack spacing={1}>
                                    <Badge fontSize="xx-small" colorScheme="purple">{t.category}</Badge>
                                    <Text fontSize="xs" color="gray.400">• {new Date(t.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</Text>
                                </HStack>
                            </Box>
                        </HStack>
                        <VStack align="end" spacing={0}>
                            <Text fontWeight="bold" fontSize="sm" color={t.amount<0?"red.500":"green.500"}>
                                {t.amount<0?"-":"+"}{formatRupiah(Math.abs(t.amount))}
                            </Text>
                            <Text fontSize="xs" color="gray.400">{t.wallet}</Text>
                        </VStack>
                    </Flex>
                ))}
            </VStack>
          </Box>

        </VStack>
      </Container>

      {/* ALERT RESET */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent m={4} borderRadius="xl">
            <AlertDialogHeader>Reset Semua Data?</AlertDialogHeader>
            <AlertDialogBody>Data yang dihapus tidak bisa kembali.</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} size="sm">Batal</Button>
              <Button colorScheme="red" onClick={() => {resetData(); onClose();}} ml={3} size="sm">Hapus</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}