import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { AppShell } from "./components/AppShell";
import { useState } from "react";

type Page = "home" | "login";

export default function App() {
  const [page, setPage] = useState<Page>("home");

  return (
    <AppShell page={page} onNavigate={setPage}>
      {page === "home" ? <HomePage /> : <LoginPage />}
    </AppShell>
  );
}
