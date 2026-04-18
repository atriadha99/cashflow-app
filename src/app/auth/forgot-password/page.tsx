"use client";
import { useState } from "react";
import {
  Box, Button, Input, VStack, Heading, Text, useToast, Container,
  FormControl, FormLabel, InputGroup, InputLeftAddon, Icon, Card, CardBody,
  Link as ChakraLink, Spinner, HStack
} from "@chakra-ui/react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({ 
        title: "Error", 
        description: "Masukkan email yang valid", 
        status: "error" 
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({ 
          title: "Gagal", 
          description: result.error || "Terjadi kesalahan", 
          status: "error" 
        });
        return;
      }

      setSubmitted(true);
      toast({ 
        title: "Berhasil!", 
        description: "Link reset password telah dikirim ke email Anda", 
        status: "success",
        duration: 5000
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Terjadi kesalahan", 
        status: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bgGradient="linear(to-b, red.600, red.50, white)" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Container maxW="md">
        <VStack mb={8} spacing={3}>
          <Box p={4} bg="white" borderRadius="full" shadow="2xl">
            <Icon as={Mail} boxSize={10} color="red.600" />
          </Box>
          <Heading color="white" size="2xl">Reset Password</Heading>
          <Text color="red.100" fontSize="md">Masukkan email Anda untuk menerima link reset</Text>
        </VStack>

        <Card borderRadius="3xl" shadow="2xl">
          <CardBody p={8}>
            {submitted ? (
              <VStack spacing={6} textAlign="center">
                <Box p={4} bg="green.50" borderRadius="xl" w="full">
                  <Text color="green.700" fontWeight="600" mb={2}>
                    ✓ Email Terkirim
                  </Text>
                  <Text color="green.600" fontSize="sm">
                    Kami telah mengirimkan link reset password ke email <strong>{email}</strong>
                  </Text>
                </Box>

                <VStack spacing={3} w="full" pt={4}>
                  <Text fontSize="sm" color="gray.600">
                    Link reset password berlaku selama 24 jam. Silakan cek folder spam jika tidak menemukan email.
                  </Text>
                  
                  <Button
                    w="full"
                    size="lg"
                    colorScheme="red"
                    as={Link}
                    href="/auth"
                  >
                    Kembali ke Login
                  </Button>
                </VStack>
              </VStack>
            ) : (
              <VStack spacing={5}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="600">Email</FormLabel>
                  <InputGroup>
                    <InputLeftAddon bg="gray.50" children={<Icon as={Mail} w={5} h={5} />} />
                    <Input 
                      type="email" 
                      placeholder="contoh@email.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      isDisabled={loading}
                      onKeyPress={(e) => e.key === 'Enter' && handleForgotPassword()}
                    />
                  </InputGroup>
                </FormControl>

                <Text fontSize="xs" color="gray.500">
                  Kami akan mengirimkan link reset password ke email Anda. 
                  Link berlaku selama 24 jam.
                </Text>

                <Button 
                  w="full" 
                  size="lg" 
                  colorScheme="red" 
                  isLoading={loading} 
                  loadingText="Mengirim..." 
                  onClick={handleForgotPassword}
                >
                  Kirim Link Reset
                </Button>

                <HStack w="full" pt={4} borderTop="1px solid" borderColor="gray.200">
                  <Icon as={ArrowLeft} w={4} h={4} color="red.500" />
                  <Link href="/auth">
                    <ChakraLink color="red.500" fontSize="sm" fontWeight="600">
                      Kembali ke Login
                    </ChakraLink>
                  </Link>
                </HStack>
              </VStack>
            )}
          </CardBody>
        </Card>

        <Box mt={8} textAlign="center">
          <Text fontSize="xs" color="red.100">
            © 2024 TemuCashflow. Semua hak dilindungi.
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
