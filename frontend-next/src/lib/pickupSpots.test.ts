import { describe, it, expect, beforeEach } from "vitest";
import {
  PICKUP_SPOTS,
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
