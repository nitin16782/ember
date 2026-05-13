import { PropertyGeofenceConfig } from "./types";

const EARTH_RADIUS_M = 6_371_000;

export interface GeofenceResult {
  withinGeofence: boolean;
  distanceMeters: number;
  blocked: boolean;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function checkGeofence(
  property: PropertyGeofenceConfig,
  eventLat: number | null | undefined,
  eventLon: number | null | undefined
): GeofenceResult {
  if (
    property.latitude === null ||
    property.longitude === null ||
    eventLat === null ||
    eventLat === undefined ||
    eventLon === null ||
    eventLon === undefined
  ) {
    return { withinGeofence: true, distanceMeters: 0, blocked: false };
  }

  const distance = haversineDistance(
    property.latitude,
    property.longitude,
    eventLat,
    eventLon
  );
  const withinGeofence = distance <= property.radiusMeters;
  const blocked = !withinGeofence && !property.lenient;

  return { withinGeofence, distanceMeters: distance, blocked };
}
