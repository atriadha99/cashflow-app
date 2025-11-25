"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  InputGroup,
  InputLeftAddon,
  FormControl,
  FormLabel
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const handleAuth = async (type: "LOGIN" | "REGISTER") => {
    if (!email || !password) {
      toast({ title: "Error", description: "Email & Password wajib diisi", status: "error" });
      return;
    }

    setLoading(true);

    try {
      if (type === "REGISTER") {
        if (!fullName) throw new Error("Nama Lengkap wajib diisi");
        if (!phone) throw new Error("Nomor Telepon wajib diisi");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.session) {
          toast({
            title: "Pendaftaran Berhasil!",
            description: "Silakan cek INBOX EMAIL Anda untuk verifikasi akun sebelum login.",
            status: "success",
            duration: 9000,
            isClosable: true,
          });
        } else {
          toast({ title: "Berhasil!", description: "Akun telah dibuat.", status: "success" });
          router.push("/");
        }

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        toast({ title: "Login Berhasil!", status: "success" });
        router.push("/");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.message || "Terjadi kesalahan sistem",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, gray.100, purple.100)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={10}
    >
      <Container maxW="md" bg="white" p={8} borderRadius="2xl" boxShadow="xl">
        <Heading textAlign="center" mb={2} size="lg" color="purple.600">
          CashFlow App 💸
        </Heading>
        <Text textAlign="center" color="gray.500" mb={6} fontSize="sm">
          Kelola keuanganmu dengan mudah
        </Text>

        <Tabs isFitted variant="soft-rounded" colorScheme="purple">
          <TabList mb="1em">
            <Tab>Masuk</Tab>
            <Tab>Daftar</Tab>
          </TabList>
          <TabPanels>
            
            <TabPanel>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contoh@email.com"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                  />
                </FormControl>
                <Button
                  isLoading={loading}
                  colorScheme="purple"
                  w="full"
                  mt={2}
                  onClick={() => handleAuth("LOGIN")}
                >
                  Masuk Sekarang
                </Button>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">Nama Lengkap</FormLabel>
                  <Input
                    placeholder="Andika Agung"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Email</FormLabel>
                  <Input
                    type="email"
                    placeholder="Email Aktif (untuk verifikasi)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel fontSize="sm">Nomor WhatsApp</FormLabel>
                  <InputGroup>
                    <InputLeftAddon bg="gray.100" color="gray.500">+62</InputLeftAddon>
                    <Input 
                      type="tel" 
                      placeholder="812xxxxxxx" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </InputGroup>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Password</FormLabel>
                  <Input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormControl>
                
                <Button
                  isLoading={loading}
                  colorScheme="pink"
                  w="full"
                  mt={2}
                  onClick={() => handleAuth("REGISTER")}
                >
                  Daftar Akun Baru
                </Button>
                
                <Text fontSize="xs" color="gray.400" textAlign="center" mt={2}>
                  *Link verifikasi akan dikirim ke email Anda.
                </Text>
              </VStack>
            </TabPanel>

          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
}