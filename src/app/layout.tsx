// src/app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google"; // Ganti font
import { Providers } from "./providers";

// Setup font
const fontSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Cash Flow Aesthetic",
  description: "Track your money with style",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={fontSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}