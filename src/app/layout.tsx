import type { Metadata } from "next";
// GANTI KE FONT INTER DARI GOOGLE
import { Inter } from "next/font/google"; 
import "./globals.css";

// DEKLARASI FONT INTER
const interSans = Inter({
  subsets: ["latin"],
  variable: '--font-sans', 
});

export const metadata: Metadata = {
  title: "TemuCashflow",
  description: "Aplikasi keuangan personal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // GUNAKAN VARIABEL interSans
    <html lang="en" className={`${interSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}