import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/hooks/ThemeProvider";
import { WalletProvider } from "@/hooks/WalletProvider";
import { Toaster } from "react-hot-toast";
import ProtectedRouteProvider from "@/components/ProtectedRouteProvider";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // Optimize font loading
});

export const metadata: Metadata = {
  title: "TNT - Trust Network Tokens",
  description:
    "Issue and manage Trust Network Tokens (TNTs) - the future of decentralized trust",
  keywords: ["blockchain", "tokens", "trust", "decentralized", "TNT", "ERC721"],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
        >
          <WalletProvider>
            <ProtectedRouteProvider>{children}</ProtectedRouteProvider>
          </WalletProvider>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #475569',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
