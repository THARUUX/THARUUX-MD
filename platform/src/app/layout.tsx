import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | THARUUX-MD - Intelligent WhatsApp Automation",
    default: "THARUUX-MD — Next-Gen WhatsApp Bot & Automation Platform",
  },
  description:
    "Empower your WhatsApp communication with THARUUX-MD. High-performance automation, interactive group management, media processing, AI integration, and enterprise reliability. Powered by THARUUX & ZYNEX Developments.",
  keywords: [
    "THARUUX-MD",
    "WhatsApp Bot",
    "WhatsApp Automation",
    "Multi-Device WhatsApp",
    "WhatsApp Marketing Sri Lanka",
    "ZYNEX Developments",
    "tharuux.lk",
    "zynexdev.com",
    "WhatsApp AI Bot",
  ],
  authors: [{ name: "THARUUX & ZYNEX Developments", url: "https://tharuux.lk" }],
  creator: "THARUUX",
  publisher: "ZYNEX Developments",
  metadataBase: new URL("https://tharuux.lk"),
  openGraph: {
    title: "THARUUX-MD — Next-Gen WhatsApp Automation Platform",
    description:
      "Enterprise-grade WhatsApp Bot Management Platform. Connect via QR, customize full bot behaviors, automated customer workflows, and interactive group features.",
    url: "https://tharuux.lk",
    siteName: "THARUUX-MD",
    images: [
      {
        url: "/images/banner.png",
        width: 1200,
        height: 630,
        alt: "THARUUX-MD WhatsApp Bot Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "THARUUX-MD — WhatsApp Bot Platform",
    description: "Multi-device WhatsApp automation platform powered by THARUUX & ZYNEX Developments.",
    images: ["/images/banner.png"],
  },
  icons: {
    icon: "/images/icon.png",
    shortcut: "/images/icon.png",
    apple: "/images/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full scroll-smooth antialiased`}>
      <head>
        <link rel="icon" href="/images/icon.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col font-sans selection:bg-purple-500/20 selection:text-purple-600">
        {children}
      </body>
    </html>
  );
}
