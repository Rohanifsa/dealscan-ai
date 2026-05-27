import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TRPCReactProvider } from "@/lib/trpc/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | DealScan AI",
    default: "DealScan AI",
  },
  description: "AI-powered private equity due diligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TRPCReactProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
