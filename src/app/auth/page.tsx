"use client";
import { useState } from "react";
import {
  Box, Button, Input, VStack, Heading, Text, useToast, Container,
  Tabs, TabList, TabPanels, Tab, TabPanel, FormControl, FormLabel,
  InputGroup, InputLeftAddon, Icon, Card, CardBody, Link as ChakraLink, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, HStack
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, User, Phone as PhoneIcon } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const router = useRouter();

  const handleAuth = async (type: "LOGIN" | "REGISTER") => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedName = fullName.trim();
    const cleanedPhone = phone.replace(/\D/g, "");

    if (!trimmedEmail || !trimmedPassword) {
      toast({ title: "Error", description: "Email & password wajib diisi", status: "error" });
      return;
    }

    if (type === "REGISTER") {
      if (!trimmedName || !cleanedPhone) {
        toast({ title: "Error", description: "Semua field wajib diisi", status: "error" });
        return;
      }
      if (trimmedPassword !== confirmPassword.trim()) {
        toast({ title: "Error", description: "Password tidak sama", status: "error" });
        return;
      }
      if (!/^8[1-9][0-9]{8,11}$/.test(cleanedPhone)) {
        toast({ title: "Error", description: "Nomor WhatsApp tidak valid", status: "error" });
        return;
      }
    }

    setLoading(true);
    try {
      if (type === "REGISTER") {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            data: { full_name: trimmedName, phone: "+62" + cleanedPhone }
          }
        });
        if (error) throw error;
        toast({
          title: "Berhasil!",
          description: "Cek email kamu untuk verifikasi",
          status: "success",
          duration: 8000
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword
        });
        if (error) throw error;
        toast({ title: "Login berhasil!", status: "success" });
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      const msg = error.message.includes("already registered")
        ? "Email sudah terdaftar"
        : error.message.includes("Invalid login")
        ? "Email/password salah"
        : error.message;
      toast({ title: "Gagal", description: msg, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bgGradient="linear(to-b, red.600, red.50, white)" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Container maxW="md">
        <VStack mb={8} spacing={3}>
          <Box p={4} bg="white" borderRadius="full" shadow="2xl">
            <Icon as={Lock} boxSize={10} color="red.600" />
          </Box>
          <Heading color="white" size="2xl">TemuCashflow</Heading>
          <Text color="red.100" fontSize="lg">Kelola keuanganmu dengan mudah & estetik</Text>
        </VStack>

        <Card borderRadius="3xl" shadow="2xl">
          <CardBody p={8}>
            <Tabs isFitted variant="soft-rounded" colorScheme="red">
              <TabList mb="1.5em" bg="gray.100" p={1} borderRadius="xl">
                <Tab borderRadius="lg" _selected={{ bg: "red.500", color: "white" }}>Masuk</Tab>
                <Tab borderRadius="lg" _selected={{ bg: "red.500", color: "white" }}>Daftar</Tab>
              </TabList>

              <TabPanels>
                {/* LOGIN */}
                <TabPanel px={0}>
                  <VStack spacing={5}>
                    <FormControl>
                      <FormLabel fontSize="sm">Email</FormLabel>
                      <InputGroup>
                        <InputLeftAddon bg="gray.50" children={<Icon as={Mail} w={5} h={5} />} />
                        <Input type="email" placeholder="contoh@email.com" value={email} onChange={(e) => setEmail(e.target.value)} isDisabled={loading} />
                      </InputGroup>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Password</FormLabel>
                      <InputGroup>
                        <InputLeftAddon bg="gray.50" children={<Icon as={Lock} w={5} h={5} />} />
                        <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} isDisabled={loading} />
                      </InputGroup>
                    </FormControl>
                    <Button w="full" size="lg" colorScheme="red" isLoading={loading} loadingText="Masuk..." onClick={() => handleAuth("LOGIN")}>
                      Masuk Sekarang
                    </Button>
                    
                    <HStack w="full" justifyContent="center" pt={2}>
                      <Text fontSize="sm" color="gray.600">
                        Lupa password?
                      </Text>
                      <Link href="/auth/forgot-password">
                        <Text as="span" fontSize="sm" color="red.500" fontWeight="600" cursor="pointer" _hover={{ textDecoration: "underline" }}>
                          Reset di sini
                        </Text>
                      </Link>
                    </HStack>
                  </VStack>
                </TabPanel>

                {/* REGISTER */}
                <TabPanel px={0}>
                  <VStack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Nama Lengkap</FormLabel>
                      <InputGroup>
                        <InputLeftAddon bg="gray.50" children={<Icon as={User} w={5} h={5} />} />
                        <Input placeholder="Nama kamu" value={fullName} onChange={(e) => setFullName(e.target.value)} isDisabled={loading} />
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Nomor WhatsApp</FormLabel>
                      <InputGroup>
                        <InputLeftAddon bg="gray.50" children={<Text fontWeight="bold">+62</Text>} />
                        <Input type="tel" placeholder="81234567890" value={phone} onChange={(e) => setPhone(e.target.value)} isDisabled={loading} />
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Email</FormLabel>
                      <InputGroup>
                        <InputLeftAddon bg="gray.50" children={<Icon as={Mail} w={5} h={5} />} />
                        <Input type="email" placeholder="contoh@email.com" value={email} onChange={(e) => setEmail(e.target.value)} isDisabled={loading} />
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Password</FormLabel>
                      <InputGroup>
                        <InputLeftAddon bg="gray.50" children={<Icon as={Lock} w={5} h={5} />} />
                        <Input type="password" placeholder="Min. 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} isDisabled={loading} />
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Konfirmasi Password</FormLabel>
                      <InputGroup>
                        <InputLeftAddon bg="gray.50" children={<Icon as={Lock} w={5} h={5} />} />
                        <Input type="password" placeholder="Ketik ulang" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} isDisabled={loading} />
                      </InputGroup>
                    </FormControl>

                    <Button w="full" size="lg" colorScheme="red" isLoading={loading} loadingText="Mendaftar..." onClick={() => handleAuth("REGISTER")}>
                      Daftar Akun Baru
                    </Button>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}