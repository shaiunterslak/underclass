import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const APP_URL = "https://underclass.sh";

export const metadata: Metadata = {
  title: "underclass — will you survive the age of AI?",
  description:
    "Paste your LinkedIn and AI simulates the next 50 years of your career. Your PUL score reveals whether you'll join the elite — or fall into the permanent underclass.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "underclass — will you survive the age of AI?",
    description:
      "AI simulates the next 50 years of your career. Find out your Permanent Underclass Likelihood score.",
    url: APP_URL,
    siteName: "underclass",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "underclass — will you survive the age of AI?",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "underclass — will you survive the age of AI?",
    description:
      "AI simulates the next 50 years of your career. Find out your Permanent Underclass Likelihood score.",
    images: [`${APP_URL}/og-image.png`],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
