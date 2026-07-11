import type { Metadata } from "next";
import { Jost, Fraunces } from "next/font/google";
import "./globals.css";
import GlobalFetchLoader from "@/components/GlobalFetchLoader";

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.digitalreceipt.ng'),
  title: "DigitalReceipt.ng: Generate, Verify and Manage Authentic Receipts",
  description:
    "A digital receipt generation and verification platform for Nigerian individuals and businesses. Create verifiable digital receipts with QR codes your customers can confirm instantly.",
  openGraph: {
    title: "DigitalReceipt.ng — Authentic Digital Receipts for Nigerians",
    description:
      "Create verifiable digital receipts with QR codes your customers can confirm instantly. Free for individuals and businesses across Nigeria.",
    url: "https://www.digitalreceipt.ng",
    siteName: "DigitalReceipt.ng",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DigitalReceipt.ng — Authentic Digital Receipts",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DigitalReceipt.ng — Authentic Digital Receipts for Nigerians",
    description:
      "Create verifiable digital receipts with QR codes your customers can confirm instantly.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GlobalFetchLoader />
        {children}
      </body>
    </html>
  );
}
