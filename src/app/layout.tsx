import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "企業リサーチ | Company Research",
  description: "URLから企業の業績・評判を分析するリサーチツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased bg-gray-50">{children}</body>
    </html>
  );
}
