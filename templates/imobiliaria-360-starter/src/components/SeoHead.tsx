import { useEffect } from "react";

type SeoHeadProps = {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown> | null;
};

export function SeoHead({ title, description, jsonLd }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    const scriptId = "x09-jsonld";
    const prev = document.getElementById(scriptId);
    if (prev) prev.remove();

    if (jsonLd) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, jsonLd]);

  return null;
}

export function buildPropertyJsonLd(input: {
  name: string;
  description: string;
  price: number;
  url: string;
  address?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: input.name,
    description: input.description,
    url: input.url,
    address: input.address,
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: "BRL",
    },
  };
}
