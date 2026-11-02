import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "JobPilot — Autonomous Job Application Platform",
  description:
    "Connect your job portals, set your preferences, and let the autopilot hunt, match, tailor and apply to jobs on your behalf. Next.js · FastAPI · Socket.IO · Laravel.",
  keywords: ["job search", "auto apply", "autopilot", "Indeed", "LinkedIn", "AI resume", "job automation"],
  authors: [{ name: "faisukhan01" }],
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
