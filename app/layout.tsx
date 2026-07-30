import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OfferFlow | Practical digital toolkits",
  description: "Practical ebooks, templates and business toolkits designed to help you take action."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
