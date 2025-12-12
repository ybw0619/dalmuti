import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "달무티 게임",
  description: "온라인 멀티플레이어 달무티 카드 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
