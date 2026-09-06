import type { Metadata } from "next";
import { DM_Sans, Nunito } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bucketly",
  description: "Track which countries, national parks, US states, and MLB stadiums you've visited.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface-page font-sans">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
