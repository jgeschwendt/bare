import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bare - Worktree Manager",
  description: "Multi-repository worktree manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
