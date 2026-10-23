import type { Metadata } from "next";
import { AppFrame } from "@/components/AppFrame";
import { JarvisProvider } from "@/components/JarvisProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS",
  description: "Dein persönlicher Assistent und Trading-Desk",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <JarvisProvider>
          <AppFrame>{children}</AppFrame>
        </JarvisProvider>
      </body>
    </html>
  );
}
