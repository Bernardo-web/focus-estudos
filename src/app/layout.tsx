import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: { default: "Focus", template: "%s · Focus" },
  description: "Organizador de estudos para concursos.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Focus", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1a2f80",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value;
  return (
    <html lang="pt-BR" data-theme={theme === "light" || theme === "dark" ? theme : undefined}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
