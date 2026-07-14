import type { Metadata } from "next";
import "./globals.css";

import { ProjectProvider } from "@/contexts/ProjectContext";

export const metadata: Metadata = {
  title: "X09 Studio",
  description: "Software House movida por IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ProjectProvider>
          {children}
        </ProjectProvider>
      </body>
    </html>
  );
}