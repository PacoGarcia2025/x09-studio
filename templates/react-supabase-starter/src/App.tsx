import { useState } from "react";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

type Page = "home" | "login" | "app";

/** Entrypoint: Home + Login + Dashboard (sem chrome "Meu App"). */
export default function App() {
  const [page, setPage] = useState<Page>("home");

  if (page === "login") {
    return (
      <LoginPage
        onNavigateHome={() => setPage("home")}
        onNavigateApp={() => setPage("app")}
      />
    );
  }

  if (page === "app") {
    return (
      <DashboardPage
        onNavigateHome={() => setPage("home")}
        onSignOut={() => setPage("home")}
      />
    );
  }

  return <HomePage onNavigateToLogin={() => setPage("login")} />;
}
