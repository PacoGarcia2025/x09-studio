import type { Property } from "../lib/properties";

export type LatLngBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export function propertyHasCoords(p: Property): p is Property & { lat: number; lng: number } {
  return typeof p.lat === "number" && typeof p.lng === "number";
}

export function filterPropertiesInBounds(
  properties: Property[],
  bounds: LatLngBounds,
): Property[] {
  return properties.filter((p) => {
    if (!propertyHasCoords(p)) return false;
    return (
      p.lat >= bounds.south &&
      p.lat <= bounds.north &&
      p.lng >= bounds.west &&
      p.lng <= bounds.east
    );
  });
}

export function boundsFromProperties(properties: Property[]): LatLngBounds | null {
  const withCoords = properties.filter(propertyHasCoords);
  if (withCoords.length === 0) return null;

  let south = withCoords[0]!.lat;
  let north = withCoords[0]!.lat;
  let west = withCoords[0]!.lng;
  let east = withCoords[0]!.lng;

  for (const p of withCoords) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }

  return { south, west, north, east };
}
