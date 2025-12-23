import "./globals.css";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Bare - Worktree Manager",
  description: "Multi-repository worktree manager",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-white dark:bg-black text-black dark:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
