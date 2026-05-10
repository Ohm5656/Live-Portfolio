import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Live Portfolio Estimator",
  description: "ประเมินพอร์ตลงทุนของคุณด้วยราคาตลาดที่ไวกว่า",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
