import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaféConnect — Crafted Coffee, Delivered Fresh",
  description: "Artisan coffee, fresh-baked goods, and gourmet snacks crafted with care and delivered to your door.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: '#FAF8F5' }}>
        {children}
      </body>
    </html>
  );
}

// Made with Bob
