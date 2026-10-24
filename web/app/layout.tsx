import type { Metadata } from "next";
import { Anton, Inter_Tight, Nothing_You_Could_Do } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/TopBar";
import { SmoothScroll } from "@/components/SmoothScroll";

const anton = Anton({ weight: "400", variable: "--font-anton", subsets: ["latin"] });
const inter = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"] });
const hand = Nothing_You_Could_Do({ weight: "400", variable: "--font-hand", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VeriCanopy — Carbon credits that prove themselves",
  description: "Satellite AI scores every forest credit, a zero-knowledge proof verifies the score on-chain, and the credit keeps watching the forest.",
  icons: { icon: "/logo-mark.svg" },
  openGraph: { title: "VeriCanopy", description: "Carbon credits that prove themselves.", images: ["/og.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable} ${hand.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <SmoothScroll />
          <TopBar />
          <main className="flex-1 flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
