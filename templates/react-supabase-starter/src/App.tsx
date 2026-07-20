import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { useState } from "react";

type Page = "home" | "login";

/** Entrypoint: Home + Login (sem chrome "Meu App"). */
export default function App() {
  const [page, setPage] = useState<Page>("home");

  if (page === "login") {
    return <LoginPage onNavigateHome={() => setPage("home")} />;
  }

  return <HomePage onNavigateToLogin={() => setPage("login")} />;
}
