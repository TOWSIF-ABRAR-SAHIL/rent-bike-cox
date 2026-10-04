import { describe, it, expect } from "vitest";
import { hasPhoto, orderPhotoFirst, pickHeroBikes } from "@/lib/photoFirst";

const bike = (model: string, images?: string[]) => ({ model, images });

describe("photoFirst", () => {
  const photoLess = bike("TVS Scooty Pep Plus", []);
  const withPhotoA = bike("TVS Ntorq 125", ["https://example.test/a.jpg"]);
  const withPhotoB = bike("Yamaha FZ-S V3", ["https://example.test/b.jpg"]);

  it("treats a missing or empty image list as no photo", () => {
    expect(hasPhoto(photoLess)).toBe(false);
    expect(hasPhoto(bike("No field"))).toBe(false);
    expect(hasPhoto(withPhotoA)).toBe(true);
  });

  it("never opens the hero on a photo-less bike", () => {
    const hero = pickHeroBikes([photoLess, withPhotoA, withPhotoB]);
    expect(hero.map(b => b.model)).toEqual(["TVS Ntorq 125", "Yamaha FZ-S V3"]);
    expect(hasPhoto(hero[0])).toBe(true);
  });

  it("keeps the carousel populated when the catalogue has no photos", () => {
    const only = [photoLess];
    expect(pickHeroBikes(only)).toEqual(only);
  });

  it("sorts the grid photo-first without dropping the photo-less listing", () => {
    const ordered = orderPhotoFirst([photoLess, withPhotoA, withPhotoB]);
    expect(ordered.map(b => b.model)).toEqual([
      "TVS Ntorq 125",
      "Yamaha FZ-S V3",
      "TVS Scooty Pep Plus",
    ]);
    expect(ordered).toHaveLength(3);
  });

  it("preserves the original order within each group", () => {
    const ordered = orderPhotoFirst([photoLess, withPhotoB, withPhotoA]);
    expect(ordered.map(b => b.model)).toEqual([
      "Yamaha FZ-S V3",
      "TVS Ntorq 125",
      "TVS Scooty Pep Plus",
    ]);
  });
});
