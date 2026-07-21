import { useEffect, useState, type ReactNode } from "react";
import { CookieConsent } from "./components/CookieConsent";
import { SeoHead } from "./components/SeoHead";
import { HomePage } from "./pages/HomePage";
import { ListingsPage } from "./pages/ListingsPage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { BrokerDashboardPage } from "./pages/BrokerDashboardPage";
import { OwnerPortalPage } from "./pages/OwnerPortalPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { getPropertyById } from "./lib/properties";
import { formatPriceBRL } from "./lib/properties";

type Page = "home" | "listings" | "property" | "login" | "broker" | "owner" | "admin";

function pageFromPathname(pathname: string): { page: Page; propertyId?: string } {
  if (pathname.startsWith("/imovel/")) {
    const id = pathname.split("/")[2];
    if (id) return { page: "property", propertyId: id };
  }
  if (pathname.startsWith("/imoveis")) return { page: "listings" };
  if (pathname.startsWith("/login")) return { page: "login" };
  return { page: "home" };
}

function navigatePath(page: Page, propertyId?: string) {
  if (page === "property" && propertyId) {
    window.history.pushState({}, "", `/imovel/${propertyId}`);
    return;
  }
  if (page === "listings") {
    window.history.pushState({}, "", "/imoveis");
    return;
  }
  if (page === "home") {
    window.history.pushState({}, "", "/");
  }
}

export default function App() {
  const initial = pageFromPathname(window.location.pathname);
  const [page, setPage] = useState<Page>(initial.page);
  const [propertyId, setPropertyId] = useState(initial.propertyId ?? "1");

  useEffect(() => {
    const onPop = () => {
      const next = pageFromPathname(window.location.pathname);
      setPage(next.page);
      if (next.propertyId) setPropertyId(next.propertyId);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(next: Page, id?: string) {
    setPage(next);
    if (id) setPropertyId(id);
    navigatePath(next, id ?? propertyId);
  }

  const property = page === "property" ? getPropertyById(propertyId) : null;

  const shell = (content: ReactNode, seo?: { title: string; description: string }) => (
    <>
      <SeoHead
        title={seo?.title ?? "Portal Imobiliário Premium"}
        description={
          seo?.description ??
          "Imóveis exclusivos de alto padrão — catálogo, tour virtual e atendimento personalizado."
        }
      />
      <CookieConsent />
      {content}
    </>
  );

  if (page === "login") {
    return shell(
      <LoginPage
        onNavigateHome={() => go("home")}
        onNavigateApp={() => go("broker")}
      />,
    );
  }

  if (page === "broker") {
    return shell(
      <BrokerDashboardPage
        onNavigateHome={() => go("home")}
        onSignOut={() => go("home")}
      />,
    );
  }

  if (page === "owner") {
    return shell(
      <OwnerPortalPage
        onNavigateHome={() => go("home")}
        onSignOut={() => go("home")}
      />,
    );
  }

  if (page === "admin") {
    return shell(
      <AdminDashboardPage
        onNavigateHome={() => go("home")}
        onSignOut={() => go("home")}
      />,
    );
  }

  if (page === "listings") {
    return shell(
      <ListingsPage
        onNavigateHome={() => go("home")}
        onSelectProperty={(id) => go("property", id)}
      />,
    );
  }

  if (page === "property" && property) {
    return shell(
      <PropertyDetailPage
        propertyId={propertyId}
        onNavigateBack={() => go("listings")}
        onNavigateListings={() => go("listings")}
      />,
      {
        title: `${property.title} — ${formatPriceBRL(property.price)}`,
        description: property.description,
      },
    );
  }

  return shell(
    <HomePage
      onNavigateToLogin={() => go("login")}
      onNavigateListings={() => go("listings")}
      onSelectProperty={(id) => go("property", id)}
    />,
  );
}
