import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAYA — Couture sur mesure",
  description: "Découvrez 200 inspirations de couture, réservez votre rendez-vous et suivez votre création.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
