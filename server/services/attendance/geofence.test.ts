import { describe, expect, it } from "vitest";
import { checkGeofence, haversineDistance } from "./geofence";
import { PropertyGeofenceConfig } from "./types";

const PROPERTY_LAT = 12.971599;
const PROPERTY_LON = 77.594566;

function property(overrides: Partial<PropertyGeofenceConfig> = {}): PropertyGeofenceConfig {
  return {
    propertyId: "prop-1",
    latitude: PROPERTY_LAT,
    longitude: PROPERTY_LON,
    radiusMeters: 100,
    lenient: false,
    weeklyOffDays: null,
    minimumDailyWorkMinutes: 360,
    ...overrides,
  };
}

function offsetMeters(
  lat: number,
  lon: number,
  meters: number,
  bearingRad: number
): { lat: number; lon: number } {
  const R = 6_371_000;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lon * Math.PI) / 180;
  const angular = meters / R;
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(angular) +
      Math.cos(phi1) * Math.sin(angular) * Math.cos(bearingRad)
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angular) * Math.cos(phi1),
      Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2)
    );
  return { lat: (phi2 * 180) / Math.PI, lon: (lambda2 * 180) / Math.PI };
}

describe("checkGeofence", () => {
  it("returns within=true at exact property center", () => {
    const r = checkGeofence(property(), PROPERTY_LAT, PROPERTY_LON);
    expect(r.withinGeofence).toBe(true);
    expect(r.distanceMeters).toBeLessThan(0.001);
    expect(r.blocked).toBe(false);
  });

  it("returns within=true when 50m away with 100m radius", () => {
    const { lat, lon } = offsetMeters(PROPERTY_LAT, PROPERTY_LON, 50, 0);
    const r = checkGeofence(property({ radiusMeters: 100, lenient: false }), lat, lon);
    expect(r.withinGeofence).toBe(true);
    expect(r.distanceMeters).toBeGreaterThan(49);
    expect(r.distanceMeters).toBeLessThan(51);
    expect(r.blocked).toBe(false);
  });

  it("blocks when 150m away with 100m radius and lenient=false", () => {
    const { lat, lon } = offsetMeters(PROPERTY_LAT, PROPERTY_LON, 150, 0);
    const r = checkGeofence(property({ radiusMeters: 100, lenient: false }), lat, lon);
    expect(r.withinGeofence).toBe(false);
    expect(r.distanceMeters).toBeGreaterThan(149);
    expect(r.distanceMeters).toBeLessThan(151);
    expect(r.blocked).toBe(true);
  });

  it("does not block when 150m away with 100m radius but lenient=true", () => {
    const { lat, lon } = offsetMeters(PROPERTY_LAT, PROPERTY_LON, 150, 0);
    const r = checkGeofence(property({ radiusMeters: 100, lenient: true }), lat, lon);
    expect(r.withinGeofence).toBe(false);
    expect(r.blocked).toBe(false);
  });

  it("returns within=true when property has null latitude (cannot validate)", () => {
    const r = checkGeofence(property({ latitude: null }), PROPERTY_LAT, PROPERTY_LON);
    expect(r.withinGeofence).toBe(true);
    expect(r.blocked).toBe(false);
  });

  it("returns within=true when event coordinate is null (cannot validate)", () => {
    const r = checkGeofence(property(), null, null);
    expect(r.withinGeofence).toBe(true);
    expect(r.blocked).toBe(false);
  });

  it("returns within=true when event coordinate is undefined", () => {
    const r = checkGeofence(property(), undefined, undefined);
    expect(r.withinGeofence).toBe(true);
    expect(r.blocked).toBe(false);
  });
});

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistance(12.97, 77.59, 12.97, 77.59)).toBeCloseTo(0, 3);
  });

  it("computes Mumbai to Delhi within 1% of ~1158 km", () => {
    const mumbai = { lat: 19.076, lon: 72.8777 };
    const delhi = { lat: 28.6139, lon: 77.209 };
    const d = haversineDistance(mumbai.lat, mumbai.lon, delhi.lat, delhi.lon);
    const expectedM = 1_158_000;
    const ratio = Math.abs(d - expectedM) / expectedM;
    expect(ratio).toBeLessThan(0.01);
  });

  it("is symmetric", () => {
    const a = haversineDistance(12.971599, 77.594566, 13.0827, 80.2707);
    const b = haversineDistance(13.0827, 80.2707, 12.971599, 77.594566);
    expect(a).toBeCloseTo(b, 3);
  });
});
