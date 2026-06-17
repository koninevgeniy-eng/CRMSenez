import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "CRM Сенеж — Управление образовательными мероприятиями",
  description: "Внутрикорпоративная CRM-система для управления образовательными мероприятиями. Единый путь мероприятия от плана до закрытия отчёта.",
  icons: {
    icon: "/logos/senezh-monogram-red.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
