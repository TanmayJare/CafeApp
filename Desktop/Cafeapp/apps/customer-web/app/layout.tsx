import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CafeConnect - Order Your Favorites",
  description: "Order delicious food and beverages from your favorite café",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}

// Made with Bob
