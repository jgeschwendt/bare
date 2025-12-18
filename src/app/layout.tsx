import "./globals.css";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  title: "Bare - Worktree Manager",
  description: "Multi-repository worktree manager",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
