import type { ReactNode } from "react";

type Page = "home" | "login";

type Props = {
  page: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
};

export function AppShell({ page, onNavigate, children }: Props) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          gap: "1rem",
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #e4e4e7",
        }}
      >
        <strong>Meu App</strong>
        <button
          type="button"
          onClick={() => onNavigate("home")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: page === "home" ? 700 : 400,
          }}
        >
          Início
        </button>
        <button
          type="button"
          onClick={() => onNavigate("login")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: page === "login" ? 700 : 400,
          }}
        >
          Entrar
        </button>
      </header>
      <main style={{ padding: "1.5rem" }}>{children}</main>
    </div>
  );
}
