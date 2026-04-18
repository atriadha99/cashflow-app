"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box, Button, Input, VStack, Heading, Text, useToast, Container,
  FormControl, FormLabel, InputGroup, InputLeftAddon, Icon, Card, CardBody,
  Link as ChakraLink, HStack
} from "@chakra-ui/react";
import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(token ? true : false);
  const toast = useToast();

  useEffect(() => {
    if (!token) {
      toast({ 
        title: "Error", 
        description: "Token reset password tidak ditemukan", 
        status: "error" 
      });
    }
  }, [token, toast]);

  const handleResetPassword = async () => {
    if (!token) {
      toast({ 
        title: "Error", 
        description: "Token tidak valid", 
        status: "error" 
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({ 
        title: "Error", 
        description: "Password minimal 6 karakter", 
        status: "error" 
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ 
        title: "Error", 
        description: "Password tidak sama", 
        status: "error" 
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          setTokenValid(false);
        }
        toast({ 
          title: "Gagal", 
          description: result.error || "Terjadi kesalahan", 
          status: "error" 
        });
        return;
      }

      setSuccess(true);
      toast({ 
        title: "Berhasil!", 
        description: "Password Anda telah direset", 
        status: "success",
        duration: 3000
      });

      // Redirect ke login setelah 2 detik
      setTimeout(() => {
        router.push("/auth");
      }, 2000);
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

  if (!tokenValid) {
    return (
      <Box minH="100vh" bgGradient="linear(to-b, red.600, red.50, white)" display="flex" alignItems="center" justifyContent="center" px={4}>
        <Container maxW="md">
          <Card borderRadius="3xl" shadow="2xl">
            <CardBody p={8}>
              <VStack spacing={6} textAlign="center">
                <Icon as={AlertCircle} boxSize={12} color="red.500" />
                <VStack spacing={2}>
                  <Heading size="lg" color="gray.800">Token Tidak Valid</Heading>
                  <Text color="gray.600">
                    Link reset password tidak valid atau telah kadaluarsa
                  </Text>
                </VStack>

                <Button
                  w="full"
                  size="lg"
                  colorScheme="red"
                  as={Link}
                  href="/auth/forgot-password"
                >
                  Minta Link Baru
                </Button>

                <Button
                  w="full"
                  variant="outline"
                  colorScheme="red"
                  as={Link}
                  href="/auth"
                >
                  Kembali ke Login
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </Container>
      </Box>
    );
  }

  if (success) {
    return (
      <Box minH="100vh" bgGradient="linear(to-b, red.600, red.50, white)" display="flex" alignItems="center" justifyContent="center" px={4}>
        <Container maxW="md">
          <Card borderRadius="3xl" shadow="2xl">
            <CardBody p={8}>
              <VStack spacing={6} textAlign="center">
                <Icon as={CheckCircle} boxSize={12} color="green.500" />
                <VStack spacing={2}>
                  <Heading size="lg" color="gray.800">Password Berhasil Direset</Heading>
                  <Text color="gray.600">
                    Anda akan diarahkan ke halaman login dalam beberapa detik...
                  </Text>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bgGradient="linear(to-b, red.600, red.50, white)" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Container maxW="md">
        <VStack mb={8} spacing={3}>
          <Box p={4} bg="white" borderRadius="full" shadow="2xl">
            <Icon as={Lock} boxSize={10} color="red.600" />
          </Box>
          <Heading color="white" size="2xl">Password Baru</Heading>
          <Text color="red.100" fontSize="md">Buat password baru untuk akun Anda</Text>
        </VStack>

        <Card borderRadius="3xl" shadow="2xl">
          <CardBody p={8}>
            <VStack spacing={5}>
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="600">Password Baru</FormLabel>
                <InputGroup>
                  <InputLeftAddon bg="gray.50" children={<Icon as={Lock} w={5} h={5} />} />
                  <Input 
                    type="password" 
                    placeholder="Minimal 6 karakter" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    isDisabled={loading}
                  />
                </InputGroup>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="600">Konfirmasi Password</FormLabel>
                <InputGroup>
                  <InputLeftAddon bg="gray.50" children={<Icon as={Lock} w={5} h={5} />} />
                  <Input 
                    type="password" 
                    placeholder="Ketik ulang password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    isDisabled={loading}
                    onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
                  />
                </InputGroup>
              </FormControl>

              <Text fontSize="xs" color="gray.500">
                Password harus minimal 6 karakter dan kombinasi huruf serta angka.
              </Text>

              <Button 
                w="full" 
                size="lg" 
                colorScheme="red" 
                isLoading={loading} 
                loadingText="Mereset..." 
                onClick={handleResetPassword}
              >
                Reset Password
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
