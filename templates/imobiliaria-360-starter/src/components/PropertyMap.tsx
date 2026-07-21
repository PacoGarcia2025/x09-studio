import { useEffect, useRef } from "react";
import type { Property } from "../lib/properties";
import { formatPriceBRL } from "../lib/properties";
import { propertyHasCoords, type LatLngBounds } from "../lib/map-utils";

type PropertyMapProps = {
  properties: Property[];
  highlightedId?: string | null;
  onHighlight?: (id: string | null) => void;
  onBoundsChange?: (bounds: LatLngBounds, visibleIds: string[]) => void;
  onSelect?: (id: string) => void;
  className?: string;
};

const CARTO_POSITRON =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

/** Mapa Leaflet + CartoDB Positron — pins sincronizados com listagem. */
export function PropertyMap({
  properties,
  highlightedId,
  onHighlight,
  onBoundsChange,
  onSelect,
  className = "",
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
        zoomControl: true,
      });

      L.tileLayer(CARTO_POSITRON, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      const withCoords = properties.filter(propertyHasCoords);
      if (withCoords.length > 0) {
        const group = L.featureGroup(
          withCoords.map((p) => L.marker([p.lat, p.lng])),
        );
        map.fitBounds(group.getBounds().pad(0.15));
      } else {
        map.setView([-23.5505, -46.6333], 12);
      }

      mapRef.current = map;

      const emitBounds = () => {
        const b = map.getBounds();
        const bounds: LatLngBounds = {
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        };
        const visibleIds = properties
          .filter(propertyHasCoords)
          .filter(
            (p) =>
              p.lat >= bounds.south &&
              p.lat <= bounds.north &&
              p.lng >= bounds.west &&
              p.lng <= bounds.east,
          )
          .map((p) => p.id);
        onBoundsChange?.(bounds, visibleIds);
      };

      map.on("moveend", emitBounds);
      emitBounds();
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [properties, onBoundsChange]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const p of properties) {
      if (!propertyHasCoords(p)) continue;

      const isHot = p.id === highlightedId;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background:${isHot ? "#D4AF37" : "#1c1917"};
          color:white;
          border:2px solid ${isHot ? "#fff" : "#D4AF37"};
          border-radius:9999px;
          padding:4px 8px;
          font-size:11px;
          font-weight:600;
          box-shadow:0 4px 14px rgba(0,0,0,.25);
          transform:scale(${isHot ? 1.12 : 1});
          transition:transform .15s ease;
        ">${formatPriceBRL(p.price).replace(/\s/g, " ")}</div>`,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
      marker.on("mouseover", () => onHighlight?.(p.id));
      marker.on("mouseout", () => onHighlight?.(null));
      marker.on("click", () => onSelect?.(p.id));
      markersRef.current.set(p.id, marker);
    }
  }, [properties, highlightedId, onHighlight, onSelect]);

  return (
    <div
      ref={containerRef}
      className={`h-full min-h-[320px] w-full rounded-2xl ring-1 ring-stone-200 ${className}`}
      aria-label="Mapa de imóveis"
    />
  );
}
