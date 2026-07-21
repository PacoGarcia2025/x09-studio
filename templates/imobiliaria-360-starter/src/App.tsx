import { useState } from "react";
import { CookieConsent } from "./components/CookieConsent";
import { SeoHead } from "./components/SeoHead";
import { HomePage } from "./pages/HomePage";
import { ListingsPage } from "./pages/ListingsPage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { BrokerDashboardPage } from "./pages/BrokerDashboardPage";
import { OwnerPortalPage } from "./pages/OwnerPortalPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

type Page = "home" | "listings" | "property" | "login" | "broker" | "owner" | "admin";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [propertyId, setPropertyId] = useState("1");

  if (page === "login") {
    return (
      <LoginPage
        onNavigateHome={() => setPage("home")}
        onNavigateApp={() => setPage("broker")}
      />
    );
  }

  if (page === "broker") {
    return (
      <BrokerDashboardPage
        onNavigateHome={() => setPage("home")}
        onSignOut={() => setPage("home")}
      />
    );
  }

  if (page === "owner") {
    return (
      <OwnerPortalPage
        onNavigateHome={() => setPage("home")}
        onSignOut={() => setPage("home")}
      />
    );
  }

  if (page === "admin") {
    return (
      <AdminDashboardPage
        onNavigateHome={() => setPage("home")}
        onSignOut={() => setPage("home")}
      />
    );
  }

  if (page === "listings") {
    return (
      <ListingsPage
        onNavigateHome={() => setPage("home")}
        onSelectProperty={(id) => {
          setPropertyId(id);
          setPage("property");
        }}
      />
    );
  }

  if (page === "property") {
    return (
      <PropertyDetailPage
        propertyId={propertyId}
        onNavigateBack={() => setPage("listings")}
        onNavigateListings={() => setPage("listings")}
      />
    );
  }

  return (
    <>
      <SeoHead
        title="Portal Imobiliário Premium"
        description="Imóveis exclusivos de alto padrão — catálogo, tour virtual e atendimento personalizado."
      />
      <CookieConsent />
      <HomePage onNavigateToLogin={() => setPage("login")} />
    </>
  );
}
