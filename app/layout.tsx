import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/app/components/providers/AuthProvider";
import ToastProvider from "@/app/components/providers/ToastProvider";

export const metadata: Metadata = {
  title: {
    template: "%s | KalaSetu",
    default: "KalaSetu — Discover Authentic Indian Art",
  },
  description:
    "A global art ecosystem connecting collectors with authentic Indian artisans. Explore curated collections, support heritage, and discover unique stories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
