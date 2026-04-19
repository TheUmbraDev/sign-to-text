import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignSpeak AI",
  description: "ASL Recognition and Auth Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Force-hide Next.js dev toolbar / N button if present */}
        <style>{`
          /* Common dev tool selectors (will noop if not found) */
          .nextjs-devtools-icon, [data-nextjs-devtools], #nextjs-devtools, .nextjs-devtools-container { display: none !important; }
        `}</style>
        {children}
      </body>
    </html>
  );
}
