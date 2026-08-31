import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Best Brain Academy", template: "%s · Best Brain Academy" },
  description: "Staff administration for Best Brain Academy.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
