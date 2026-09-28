import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Dashboard",
  description: "Pilotage bot BTC/USDT — infrastructure stub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
