import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Inter carries all content and UI (great tabular figures for money).
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Space Grotesk is the display face for headings, elegant at light weights.
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Hisaab: The GST copilot built into every Paytm transaction",
  description:
    "Hisaab auto-reconciles your Paytm sales with purchase invoices, flags unclaimed input tax credit, and pre-fills GSTR-3B, reviewed by a human before filing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
