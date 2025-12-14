import type { Metadata } from "next";
// GANTI DARI @vercel/font-geist MENJADI INTER
import { Inter } from "next/font/google"; 
import "./globals.css";

// UBAH NAMA CONSTANT DARI geistSans MENJADI interSans
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
    // UBAH DARI geistSans.variable MENJADI interSans.variable
    <html lang="en" className={`${interSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}