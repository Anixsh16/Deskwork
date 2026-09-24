import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const sans = Google_Sans({ subsets: ["latin"], variable: "--font-google-sans", weight: ["400", "500", "600", "700"] });
const mono = Google_Sans_Code({ subsets: ["latin"], variable: "--font-google-sans-code" });

export const metadata: Metadata = {
  title: { default: "Deskwork", template: "%s · Deskwork" },
  description: "Set the paper, check the papers, clear the desk.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
