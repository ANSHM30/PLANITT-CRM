import "../styles/globals.css";
import { SocketProvider } from "@/components/providers/socket-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Planitt CRM",
  description: "Internal CRM for sales, follow-ups, and team workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} font-sans antialiased`}>
        <ThemeProvider>
          <SocketProvider>{children}</SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
