"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Heading, Text, VStack, HStack, Input, Button,
  Card, CardBody, IconButton, Stat, StatLabel, StatNumber,
  Flex, Icon, Spinner, ButtonGroup, Select, SimpleGrid,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure,
  Badge 
} from "@chakra-ui/react"; // HAPUS keyframes dari sini

// TAMBAHKAN INI:
import { keyframes } from "@emotion/react"; 

import { 
  Trash2, Plus, WalletCards, ArrowUpRight, ArrowDownRight, 
  Camera, LogOut, User, Zap, TrendingUp, Moon, Sun, Banknote, CreditCard, Landmark
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTransactions } from "@/hooks/useTransactions";
import { formatRupiah, parseAmount, detectCategory, calculateForecast } from "@/utils/helpers";
import { supabase } from "@/lib/supabase";

const CATEGORIES = ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Gaji", "Lainnya"];
const WALLETS = ["Tunai", "BCA", "Mandiri", "Gopay", "OVO", "Dana"];

// --- 4. ANIMASI FLOATING (CSS Keyframes) ---
const float1 = keyframes`
  0% { transform: translate(0, 0); }
  50% { transform: translate(25px, -20px); }
  100% { transform: translate(0, 0); }
`;
const float2 = keyframes`
  0% { transform: translate(0, 0); }
  50% { transform: translate(-20px, 25px); }
  100% { transform: translate(0, 0); }
`;

export default function Home() {
  const { transactions, loading, user, addTransaction, deleteTransaction, resetData } = useTransactions();
  const router = useRouter();
  
  // State UI
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // --- 1. THEME PERSISTENCE (LocalStorage) ---
  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem("theme-dark");
    if (savedTheme === "true") setIsDark(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("theme-dark", isDark.toString());
    }
  }, [isDark, isMounted]);

  // --- CONFIG TEMA (CINEMATIC UPGRADE) ---
  const theme = {
    // 2. Gradient Netflix yang lebih Mature & Cinematic
    mainCardGradient: isDark 
      ? "linear(to-br, #B20710, #330000)"  // Cinematic Dark Red
      : "linear(to-br, #8A4B22, #A0522D)", // Warm Wood

    bg: isDark ? "#0F0F0F" : "#F3EDE4", // Sedikit lebih gelap dari sebelumnya
    text: isDark ? "#E5E5E5" : "#433831",
    subText: isDark ? "#A3A3A3" : "#8C7E74",
    cardBg: isDark ? "#18181B" : "#FFF8F0",
    
    // 5. Premium Shadows
    cardShadow: isDark 
      ? "0 10px 30px -10px rgba(0,0,0,0.5)" 
      : "0 10px 30px -10px rgba(138, 75, 34, 0.15)",
    
    cardBorder: isDark ? "whiteAlpha.100" : "blackAlpha.50",
    accent: isDark ? "#E50914" : "#8A4B22",
    blob1: isDark ? "red.900" : "orange.100",
    blob2: isDark ? "black" : "yellow.100",
    
    // 6. Chart Colors (Harmoni Japandi & Rich Classy)
    chartColors: isDark 
      ? ["#4CAF50", "#B20710"]  // Rich Green & Deep Red
      : ["#7AA884", "#C8846B"], // Sage & Terracotta
  };

  // Local Form States
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

  // Redirect Logic
  useEffect(() => {
    if (isMounted && !loading && !user) router.replace("/auth");
  }, [isMounted, loading, user, router]);

  // Derived State
  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });
  }, [transactions, filterMonth, filterYear]);

  const income = filteredData.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0);
  const expense = filteredData.filter(t => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
  const totalBalance = transactions.reduce((a, b) => a + b.amount, 0);
  
  const walletBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    WALLETS.forEach(w => balances[w] = 0);
    transactions.forEach(t => {
        const wName = t.wallet || "Tunai";
        if (balances[wName] !== undefined) balances[wName] += t.amount;
    });
    return balances;
  }, [transactions]);

  const chartData = [{ name: "Masuk", value: income }, { name: "Keluar", value: Math.abs(expense) }];

  // Handlers
  const handleSave = async () => {
    if (!text || !amount) return;
    let nominal = parseAmount(amount);
    if (type === "expense") nominal = -Math.abs(nominal);
    else nominal = Math.abs(nominal);

    await addTransaction({ text, amount: nominal, category, wallet });
    setText(""); setAmount("");
  };

  // Helper Resize Image
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement("img");
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);

    try {
        const compressedBase64 = await resizeImage(file);
        
        const res = await fetch("/api/scan", {
            method: "POST", 
            body: JSON.stringify({ imageBase64: compressedBase64 })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server Error: ${res.status}`);
        }

        const data = await res.json();
        
        setText(data.text || "Struk Scan");
        const detectedNominal = Math.abs(Number(data.amount) || 0);
        setAmount(detectedNominal.toString());
        setType("expense");
        setCategory(detectCategory(data.text || ""));
        setIsScanning(false);
    } catch (err) {
        setIsScanning(false);
    }
  };

  if (!isMounted) return null;
  if (loading || !user) return <Flex h="100vh" bg={theme.bg} justify="center" align="center"><Spinner size="xl" color={theme.accent} /></Flex>;

  return (
    <Box 
      minH="100vh" 
      bg={theme.bg} 
      color={theme.text}
      position="relative" 
      overflowX="hidden" 
      transition="all 0.4s ease-in-out"
      fontFamily="var(--font-sans)"
    >
      {/* 4. Background Blobs with Animation */}
      <Box 
        position="fixed" top="-10%" left="-10%" w="500px" h="500px" 
        bg={theme.blob1} borderRadius="full" filter="blur(90px)" opacity={0.4} zIndex={0} 
        animation={`${float1} 12s ease-in-out infinite`} 
      />
      <Box 
        position="fixed" bottom="10%" right="-5%" w="400px" h="400px" 
        bg={theme.blob2} borderRadius="full" filter="blur(90px)" opacity={0.4} zIndex={0} 
        animation={`${float2} 18s ease-in-out infinite`} 
      />

      <Container maxW="md" position="relative" zIndex={1} pt={6} pb={20}>
        <VStack spacing={5} align="stretch">
          
          {/* HEADER */}
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="xs" color={theme.subText} letterSpacing="wider" fontWeight="bold">DASHBOARD</Text>
              <Heading size="md" color={theme.text}>Halo, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}</Heading>
            </Box>
            <HStack spacing={1}>
                {/* 3. Tombol Dark Mode Premium Animation */}
                <IconButton 
                    aria-label="theme" 
                    icon={isDark ? <Sun size={18}/> : <Moon size={18}/>} 
                    onClick={() => setIsDark(!isDark)}
                    bg={theme.cardBg}
                    color={theme.accent}
                    shadow="sm"
                    borderRadius="xl"
                    size="sm"
                    transition="all 0.2s ease"
                    _hover={{ transform: "scale(1.15)", rotate: "10deg" }}
                />
                <IconButton 
                    aria-label="reset" icon={<Trash2 size={18}/>} 
                    bg={theme.cardBg} color="red.500" shadow="sm" borderRadius="xl" size="sm" 
                    onClick={onOpen} _hover={{ transform: "scale(1.05)" }}
                />
                <IconButton aria-label="profile" icon={<User size={18}/>} bg={theme.cardBg} color={theme.text} shadow="sm" borderRadius="xl" size="sm" onClick={() => router.push('/profile')} />
                <IconButton aria-label="logout" icon={<LogOut size={18}/>} colorScheme="red" variant="ghost" size="sm" onClick={async() => { await supabase.auth.signOut(); router.push('/auth'); }} />
            </HStack>
          </Flex>

          {/* MAIN CARD */}
          <Box 
            bgGradient={theme.mainCardGradient} 
            color="white" 
            p={6} 
            borderRadius="2xl" 
            boxShadow={theme.cardShadow} 
            position="relative" 
            overflow="hidden"
            transition="all 0.3s"
          >
            <VStack align="start" spacing={1} position="relative" zIndex={2}>
              <HStack color="whiteAlpha.900"><WalletCards size={18} /><Text fontSize="sm" fontWeight="medium">Total Aset</Text></HStack>
              <Heading size="2xl" letterSpacing="tight">{formatRupiah(totalBalance)}</Heading>
            </VStack>
            {/* Dekorasi Abstrak */}
            <Box position="absolute" right="-20px" top="-30px" boxSize="120px" bg="whiteAlpha.100" borderRadius="full" />
            <Box position="absolute" bottom="-40px" left="20px" boxSize="100px" bg="blackAlpha.300" borderRadius="full" />
          </Box>

          {/* SUMMARY CARDS */}
          <HStack spacing={3}>
            <Card flex={1} bg={theme.cardBg} border="1px" borderColor={theme.cardBorder} borderRadius="xl" boxShadow={theme.cardShadow} transition="all 0.3s">
                <CardBody p={3}>
                    <HStack mb={1} color={theme.chartColors[0]}><ArrowDownRight size={16}/><Text fontSize="xs" fontWeight="bold">MASUK</Text></HStack>
                    <Text fontWeight="bold" fontSize="md" color={theme.text}>{formatRupiah(income)}</Text>
                </CardBody>
            </Card>
            <Card flex={1} bg={theme.cardBg} border="1px" borderColor={theme.cardBorder} borderRadius="xl" boxShadow={theme.cardShadow} transition="all 0.3s">
                <CardBody p={3}>
                    <HStack mb={1} color={theme.chartColors[1]}><ArrowUpRight size={16}/><Text fontSize="xs" fontWeight="bold">KELUAR</Text></HStack>
                    <Text fontWeight="bold" fontSize="md" color={theme.text}>{formatRupiah(Math.abs(expense))}</Text>
                </CardBody>
            </Card>
          </HStack>

          {/* INFO DOMPET */}
          <Heading size="xs" color={theme.subText} mt={2}>DOMPET</Heading>
          <SimpleGrid columns={2} spacing={3}>
            {WALLETS.filter(w => walletBalances[w] !== 0).map((w) => (
                <Flex key={w} bg={theme.cardBg} p={3} borderRadius="xl" align="center" justify="space-between" border="1px" borderColor={theme.cardBorder} boxShadow={theme.cardShadow}>
                    <HStack>
                        <Icon as={w === "Tunai" ? Banknote : w.includes("BCA") ? Landmark : CreditCard} color={theme.accent} />
                        <Text fontSize="sm" fontWeight="bold" color={theme.text}>{w}</Text>
                    </HStack>
                    <Text fontSize="xs" fontWeight="bold" color={theme.subText}>{formatRupiah(walletBalances[w])}</Text>
                </Flex>
            ))}
            {Object.values(walletBalances).every(v => v === 0) && <Text fontSize="xs" color={theme.subText}>Belum ada saldo.</Text>}
          </SimpleGrid>

          {/* CHART */}
          {(income > 0 || expense < 0) && (
            <Card bg={theme.cardBg} border="1px" borderColor={theme.cardBorder} borderRadius="2xl" boxShadow={theme.cardShadow}>
              <CardBody display="flex" alignItems="center" justifyContent="space-between" p={4}>
                <Box>
                  <Heading size="sm" mb={1} color={theme.text}>Analisis</Heading>
                  <Text fontSize="xs" color={theme.subText}>Bulan {["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"][parseInt(filterMonth.toString())]} {filterYear}</Text>
                </Box>
                <Box h="80px" w="80px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={25} outerRadius={35} paddingAngle={5} dataKey="value">
                        {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={theme.chartColors[index]} stroke="none" />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>
          )}

          {/* FORM INPUT */}
          <Card bg={theme.cardBg} border="1px" borderColor={theme.cardBorder} borderRadius="2xl" boxShadow={theme.cardShadow}>
            <CardBody>
              <Heading size="sm" mb={4} color={theme.text}>Catat Transaksi</Heading>
              
              <VStack spacing={3}>
                <ButtonGroup isAttached w="full" size="sm" variant="outline">
                    <Button w="50%" borderColor={theme.cardBorder} color={type==="expense"?"white":theme.subText} bg={type==="expense"?"red.500":"transparent"} _hover={{}} onClick={()=>setType("expense")}>Keluar</Button>
                    <Button w="50%" borderColor={theme.cardBorder} color={type==="income"?"white":theme.subText} bg={type==="income"?"green.500":"transparent"} _hover={{}} onClick={()=>setType("income")}>Masuk</Button>
                </ButtonGroup>
                
                <Flex gap={2} w="full">
                    <Select bg={theme.bg} color={theme.text} borderColor={theme.cardBorder} size="sm" borderRadius="lg" value={category} onChange={(e)=>setCategory(e.target.value)}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                    <Select bg={theme.bg} color={theme.text} borderColor={theme.cardBorder} size="sm" borderRadius="lg" value={wallet} onChange={(e)=>setWallet(e.target.value)}>
                        {WALLETS.map(w => <option key={w} value={w}>{w}</option>)}
                    </Select>
                </Flex>

                <Input 
                    placeholder="Keterangan..." 
                    value={text} 
                    onChange={(e)=>setText(e.target.value)} 
                    bg={theme.bg} 
                    color={theme.text}
                    borderColor={theme.cardBorder}
                    size="sm" 
                    borderRadius="lg" 
                    _placeholder={{ color: theme.subText }}
                />
                
                <Flex gap={2} w="full">
                    <Input 
                        type="number" 
                        placeholder="Rp..." 
                        value={amount} 
                        onChange={(e)=>setAmount(e.target.value)} 
                        bg={theme.bg} 
                        color={theme.text}
                        borderColor={theme.cardBorder}
                        size="sm" 
                        borderRadius="lg"
                        _placeholder={{ color: theme.subText }} 
                    />
                    <IconButton 
                        aria-label="Scan" 
                        icon={isScanning ? <Spinner size="xs"/> : <Camera size={16}/>} 
                        size="sm" 
                        bg={theme.bg}
                        color={theme.text}
                        borderColor={theme.cardBorder}
                        border="1px"
                        onClick={() => fileInputRef.current?.click()} 
                    />
                    <input type="file" ref={fileInputRef} hidden onChange={handleScan} accept="image/*"/>
                </Flex>

                <Button w="full" bg={theme.accent} color="white" size="sm" _hover={{ opacity: 0.9 }} onClick={handleSave}>Simpan</Button>
              </VStack>
            </CardBody>
          </Card>

          {/* LIST TRANSAKSI */}
          <Box pb={10}>
            <HStack justify="space-between" mb={3}>
                <Heading size="sm" color={theme.subText}>Riwayat</Heading>
                <Select w="120px" size="xs" value={filterMonth} onChange={(e)=>setFilterMonth(parseInt(e.target.value))} bg={theme.cardBg} color={theme.text} borderColor={theme.cardBorder} borderRadius="lg">
                    {["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"].map((m,i)=>(<option key={i} value={i}>{m}</option>))}
                </Select>
            </HStack>

            <VStack spacing={3} align="stretch">
                {filteredData.length === 0 ? <Text textAlign="center" fontSize="sm" color={theme.subText} py={4}>Belum ada data bulan ini.</Text> : 
                 filteredData.map((t) => (
                    <Flex key={t.id} bg={theme.cardBg} p={3} borderRadius="xl" boxShadow="sm" border="1px" borderColor={theme.cardBorder} justify="space-between" align="center">
                        <HStack>
                            <Box p={2} bg={t.amount<0?"red.500": (isDark ? "green.600" : "green.500")} borderRadius="lg" color="white">
                                {t.amount<0 ? <TrendingUp size={16} style={{transform:'scaleY(-1)'}}/> : <TrendingUp size={16}/>}
                            </Box>
                            <Box>
                                <Text fontWeight="bold" fontSize="sm" color={theme.text} noOfLines={1}>{t.text}</Text>
                                <HStack spacing={1}>
                                    {/* 7. CLEAN BADGE CATEGORY */}
                                    <Badge 
                                      fontSize="xx-small" 
                                      bg={isDark ? "whiteAlpha.300" : "blackAlpha.200"} 
                                      color={theme.text}
                                      px={2} py={0.5} borderRadius="md"
                                    >
                                      {t.category}
                                    </Badge>
                                    <Text fontSize="xs" color={theme.subText}>• {new Date(t.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</Text>
                                </HStack>
                            </Box>
                        </HStack>
                        <VStack align="end" spacing={0}>
                            <Text fontWeight="bold" fontSize="sm" color={t.amount<0 ? "red.500" : (isDark ? "green.400" : "green.600")}>
                                {t.amount<0?"-":"+"}{formatRupiah(Math.abs(t.amount))}
                            </Text>
                            <Text fontSize="xs" color={theme.subText}>{t.wallet}</Text>
                        </VStack>
                    </Flex>
                ))}
            </VStack>
          </Box>

        </VStack>
      </Container>

      {/* ALERT RESET */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent m={4} borderRadius="xl" bg={theme.cardBg} color={theme.text}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Reset Data?</AlertDialogHeader>
            <AlertDialogBody color={theme.subText}>Data yang dihapus tidak bisa kembali.</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} size="sm" variant="ghost" color={theme.text}>Batal</Button>
              <Button colorScheme="red" onClick={() => {resetData(); onClose();}} ml={3} size="sm">Hapus</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}