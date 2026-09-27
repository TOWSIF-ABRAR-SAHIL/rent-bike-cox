import { describe, it, expect } from "vitest";
import { isScooter, resolveImages, getBikeSpecs, FALLBACK_IMG } from "@/lib/bikeMedia";
import type { Bike } from "@/types";

describe("bikeMedia", () => {
  it("detects scooters by model keywords", () => {
    expect(isScooter({ _id: "1", model: "TVS Ntorq 125" })).toBe(true);
    expect(isScooter({ _id: "1", model: "Yamaha FZ-S V3" })).toBe(false);
    expect(isScooter(undefined)).toBe(false);
    expect(isScooter(null)).toBe(false);
  });

  it("returns scooter thumbs first for scooters", () => {
    const images = resolveImages({ _id: "1", model: "Honda Dio" });
    expect(images).toHaveLength(4);
    expect(images[0]).toContain("unsplash.com");
  });

  it("replaces known-broken image ids with the fallback", () => {
    const broken = "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800";
    const images = resolveImages({ _id: "1", model: "Yamaha FZ", images: [broken] });
    expect(images).toEqual([FALLBACK_IMG]);
  });

  it("falls back when a bike has no usable images", () => {
    expect(resolveImages({ _id: "1", model: "Yamaha FZ" })).toEqual([FALLBACK_IMG]);
    expect(resolveImages(undefined)).toEqual([FALLBACK_IMG]);
  });

  it("returns known specs for catalogued models", () => {
    const specs = getBikeSpecs({ _id: "1", model: "TVS Ntorq 125" });
    const byLabel = Object.fromEntries(specs.map((s) => [s.label, s.value]));
    expect(byLabel["Engine"]).toBe("125 CC");
    expect(byLabel["Type"]).toBe("Scooter");
    expect(byLabel["Capacity"]).toBe("2 Persons");
  });

  it("derives type from category for unknown models", () => {
    const specs = getBikeSpecs({
      _id: "1",
      model: "Mystery X",
      category: { name: "Jeep" },
    } as Bike);
    const byLabel = Object.fromEntries(specs.map((s) => [s.label, s.value]));
    expect(byLabel["Type"]).toBe("Jeep");
  });
});
