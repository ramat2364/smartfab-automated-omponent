import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PlantProvider } from "@/context/PlantContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "SmartFab Automated Components — Digital Platform",
  description: "Connected Digital Platform for production, quality, and maintenance tracking.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased bg-bg-base text-text-primary min-h-screen`}>
        <AuthProvider>
          <PlantProvider>
            {children}
          </PlantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
