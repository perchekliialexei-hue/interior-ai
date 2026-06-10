import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono, Cormorant_Garamond } from 'next/font/google';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const cormorant = Cormorant_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: "Interior AI — дизайн интерьера за 2 минуты",
  description: "Загрузи фото комнаты — получи фотореалистичный 3D-концепт с мебелью JYSK и ценами. Для риелторов и владельцев квартир.",
  openGraph: {
    title: "Interior AI — дизайн интерьера за 2 минуты",
    description: "Фотореалистичный 3D-концепт с мебелью и ценами. Попробуй бесплатно.",
    url: "https://interior-ai.vercel.app",
    siteName: "Interior AI",
    images: [
  {
    url: "https://interior-ai.vercel.app/og-image.jpg",
    width: 1200,
    height: 630,
    alt: "Interior AI — 3D дизайн интерьера",
  },
],
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Interior AI — дизайн интерьера за 2 минуты",
    description: "Фотореалистичный 3D-концепт с мебелью и ценами.",
    images: ["https://interior-ai.vercel.app/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
  lang="ru"
  className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} bg-background`}
>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
