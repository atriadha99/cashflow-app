"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Heading, Text, VStack, Input, Button,
  FormControl, FormLabel, useToast, Avatar, Flex, Card, CardBody,
  Skeleton, InputGroup, InputLeftAddon
} from "@chakra-ui/react";
import { ArrowLeft, Save, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push("/auth");
          return;
        }

        const { user } = session;
        setUserId(user.id);
        setEmail(user.email || "");

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setFullName(data.full_name || "");
          setPhone(data.phone || "");
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Error loading user:", error.message);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [router]);

  const updateProfile = async () => {
    try {
      setLoading(true);

      const updates = {
        id: userId,
        full_name: fullName,
        phone: phone,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;

      toast({
        title: "Profil Diperbarui!",
        status: "success",
        duration: 2000,
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        title: "Gagal Update",
        description: error.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="#F3F4F6" py={8} px={4} fontFamily="var(--font-sans)">
      <Container maxW="md">
        
        <Button 
          leftIcon={<ArrowLeft size={18} />} 
          variant="ghost" 
          mb={6} 
          onClick={() => router.back()}
        >
          Kembali ke Dashboard
        </Button>

        <VStack spacing={6} align="stretch">
          
          <Flex direction="column" align="center" mb={4}>
            <Avatar size="2xl" name={fullName} bg="purple.500" mb={4} icon={<User size={40}/>} />
            <Heading size="md" color="gray.700">{fullName || "User Tanpa Nama"}</Heading>
            <Text fontSize="sm" color="gray.500">{email}</Text>
          </Flex>

          <Card borderRadius="2xl" boxShadow="sm">
            <CardBody>
              <VStack spacing={4}>
                
                <FormControl>
                  <FormLabel fontSize="sm" color="gray.600">Email (Tidak dapat diubah)</FormLabel>
                  <Input value={email} isReadOnly bg="gray.100" color="gray.500" />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" color="gray.600">Nama Lengkap</FormLabel>
                  {loading ? <Skeleton height="40px" /> : (
                    <Input 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="Nama Kamu..."
                      focusBorderColor="purple.500"
                    />
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" color="gray.600">Nomor WhatsApp</FormLabel>
                  {loading ? <Skeleton height="40px" /> : (
                    <InputGroup>
                      <InputLeftAddon bg="gray.50">+62</InputLeftAddon>
                      <Input 
                        type="tel"
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="812xxxx"
                        focusBorderColor="purple.500"
                      />
                    </InputGroup>
                  )}
                </FormControl>

                <Button 
                  w="full" 
                  colorScheme="purple" 
                  leftIcon={<Save size={18} />} 
                  onClick={updateProfile}
                  isLoading={loading}
                  mt={2}
                >
                  Simpan Perubahan
                </Button>

              </VStack>
            </CardBody>
          </Card>

        </VStack>
      </Container>
    </Box>
  );
}