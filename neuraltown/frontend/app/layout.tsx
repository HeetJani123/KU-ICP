import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simcity.AI - Where AI Lives",
  description: "Watch AI agents live autonomous lives in a small town powered by Google Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
