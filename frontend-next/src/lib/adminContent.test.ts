import { describe, it, expect } from "vitest";
import { groupContentPayload } from "@/lib/adminContent";

describe("groupContentPayload", () => {
  it("reads the page endpoint shape { page, sections, items }", () => {
    // GET /content/page/:page — the shape that used to make the editor throw and show
    // "Failed to load content".
    const payload = {
      page: "home",
      sections: { hero: { "home.hero.title": { value: "Hi", type: "text" } } },
      items: [
        { key: "home.hero.title", value: "Hi", section: "hero", type: "text" },
        { key: "home.hero.subtitle", value: "Sub", section: "hero", type: "text" },
        { key: "global.businessName", value: "RBC", section: "business", type: "text" },
      ],
    };
    const { map, metaMap, sections } = groupContentPayload(payload);
    expect(map["home.hero.title"]).toBe("Hi");
    expect(Object.keys(map)).toHaveLength(3);
    expect(metaMap["global.businessName"].section).toBe("business");
    expect(sections).toEqual(["hero", "business"]);
  });

  it("reads the admin endpoint array shape", () => {
    const payload = [
      { key: "a", value: "1", section: "s1" },
      { key: "b", value: "2" },
    ];
    const { map, sections } = groupContentPayload(payload);
    expect(map).toEqual({ a: "1", b: "2" });
    expect(sections).toEqual(["s1"]);
  });

  it("never throws on a shape it does not recognise", () => {
    expect(groupContentPayload(null)).toEqual({ map: {}, metaMap: {}, sections: [] });
    expect(groupContentPayload({ page: "home" }).map).toEqual({});
  });
});
