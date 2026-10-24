import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/TopBar";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Cursor } from "@/components/Cursor";


export const metadata: Metadata = {
  metadataBase: new URL("https://vericanopy.vercel.app"),
  title: { default: "VeriCanopy — Carbon credits that prove themselves", template: "%s · VeriCanopy" },
  description: "Satellite AI scores every forest credit, a zero-knowledge proof verifies the score on-chain, and the credit keeps watching the forest.",
  icons: { icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }], apple: "/brand/og.png" },
  openGraph: { title: "VeriCanopy", description: "Carbon credits that prove themselves.", images: ["/brand/og.png"], siteName: "VeriCanopy", type: "website" },
  twitter: { card: "summary_large_image", title: "VeriCanopy", description: "Carbon credits that prove themselves.", images: ["/brand/og.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <SmoothScroll />
          <Cursor />
          <TopBar />
          <main className="flex-1 flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
