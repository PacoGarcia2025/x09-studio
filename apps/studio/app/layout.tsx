import type { Metadata } from "next";
import "./globals.css";

import { ProjectProvider } from "@/contexts/ProjectContext";
import { WorkbenchProvider } from "@/contexts/WorkbenchContext";

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

          <WorkbenchProvider>

            {children}

          </WorkbenchProvider>

        </ProjectProvider>

      </body>
    </html>
  );
}