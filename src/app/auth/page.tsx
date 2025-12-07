"use client";

import { useState } from "react";
import {
  Box, Button, Input, VStack, Heading, Text, useToast, Container,
  Tabs, TabList, TabPanels, Tab, TabPanel, FormControl, FormLabel, InputGroup, InputLeftAddon
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
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, phone: phone } },
        });
        if (error) throw error;
        toast({ title: "Cek Email!", description: "Link verifikasi telah dikirim.", status: "success" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      }
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bgGradient="linear(to-b, red.600, white)" display="flex" alignItems="center" justifyContent="center" py={10}>
      <Container maxW="md" bg="white" p={8} borderRadius="3xl" boxShadow="2xl">
        <Heading textAlign="center" mb={2} size="lg" color="red.600">TemuCashflow</Heading>
        <Text textAlign="center" color="gray.500" mb={6} fontSize="sm">
          "Temu tak sekedar tatap, tapi ada juga modal yang harus dicatat."
        </Text>

        <Tabs isFitted variant="soft-rounded" colorScheme="red">
          <TabList mb="1em">
            <Tab>Masuk</Tab>
            <Tab>Daftar</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">Email</FormLabel>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Password</FormLabel>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </FormControl>
                <Button isLoading={loading} colorScheme="red" w="full" onClick={() => handleAuth("LOGIN")}>Masuk</Button>
              </VStack>
            </TabPanel>
            <TabPanel>
              <VStack spacing={4}>
                <FormControl><FormLabel fontSize="sm">Nama Lengkap</FormLabel><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></FormControl>
                <FormControl><FormLabel fontSize="sm">Email</FormLabel><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">WhatsApp</FormLabel>
                  <InputGroup><InputLeftAddon>+62</InputLeftAddon><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></InputGroup>
                </FormControl>
                <FormControl><FormLabel fontSize="sm">Password</FormLabel><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormControl>
                <Button isLoading={loading} colorScheme="red" w="full" onClick={() => handleAuth("REGISTER")}>Daftar</Button>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
}