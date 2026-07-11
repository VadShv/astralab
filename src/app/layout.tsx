import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Astra HR Lab — Космическая лаборатория HR-промптов",
  description:
    "Ультратехнологичная платформа для создания, версионирования и A/B-тестирования HR-промптов. Скрининг, интервью, онбординг, performance review — на базе иммутабельных версий и статистически корректных экспериментов.",
  keywords: [
    "HR промпты",
    "AI в HR",
    "скрининг резюме",
    "AI интервью",
    "версионирование промптов",
    "A/B тестирование",
    "LLM HR",
    "рекрутинг AI",
  ],
  authors: [{ name: "Astra HR Lab" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Astra HR Lab — Космическая лаборатория HR-промптов",
    description: "Версионирование, A/B-тесты и мгновенный откат для HR-промптов.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
