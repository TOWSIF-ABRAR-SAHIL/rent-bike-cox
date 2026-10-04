import { describe, it, expect, beforeEach } from "vitest";
import {
  PICKUP_SPOTS,
  PICKUP_SPOT_COORDS,
  getSavedPickupLocation,
  savePickupLocation,
  clearPickupLocation,
} from "@/lib/pickupSpots";

describe("pickupSpots", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exposes the Cox's Bazar hotspot list", () => {
    expect(PICKUP_SPOTS).toContain("Marine Drive");
    expect(PICKUP_SPOTS.length).toBeGreaterThan(0);
  });

  it("gives every pickup spot a map pin", () => {
    // The teaser map is built from these two lists; a name without coordinates
    // silently drops its pin from the homepage.
    const missing = PICKUP_SPOTS.filter(name => !PICKUP_SPOT_COORDS[name]);
    expect(missing).toEqual([]);
    expect(Object.keys(PICKUP_SPOT_COORDS).sort()).toEqual([...PICKUP_SPOTS].sort());
  });

  it("keeps every pin inside the Cox's Bazar coastal box on land", () => {
    // Guards the class of bug where hand-written coordinates (or a lat/lng
    // swap) put a pin in the Bay of Bengal: [21.13, 92.06] is Inani, while
    // [92.06, 21.13] or a stray value lands in open water.
    for (const name of PICKUP_SPOTS) {
      const [lat, lng] = PICKUP_SPOT_COORDS[name];
      expect(lat, `${name} lat`).toBeGreaterThan(21.1);
      expect(lat, `${name} lat`).toBeLessThan(21.5);
      expect(lng, `${name} lng`).toBeGreaterThan(91.9);
      expect(lng, `${name} lng`).toBeLessThan(92.1);
    }
  });

  it("returns empty string when nothing saved", () => {
    expect(getSavedPickupLocation()).toBe("");
  });

  it("persists and reads back the pickup location", () => {
    savePickupLocation("Inani Beach");
    expect(getSavedPickupLocation()).toBe("Inani Beach");
  });

  it("clear removes the saved location", () => {
    savePickupLocation("Himchari");
    clearPickupLocation();
    expect(getSavedPickupLocation()).toBe("");
  });

  it("saving empty clears the stored value", () => {
    savePickupLocation("Kolatoli");
    savePickupLocation("");
    expect(getSavedPickupLocation()).toBe("");
  });
});
