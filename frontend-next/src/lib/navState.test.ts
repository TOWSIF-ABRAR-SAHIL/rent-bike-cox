import { describe, it, expect } from "vitest";
import { setNavState, takeNavState } from "@/lib/navState";

describe("navState", () => {
  it("returns the value set under the same key", () => {
    setNavState("checkout", { duration: 4 });
    expect(takeNavState("checkout")).toEqual({ duration: 4 });
  });

  it("is one-shot: second take returns undefined", () => {
    setNavState("login", { message: "hi" });
    expect(takeNavState<{ message: string }>("login")).toEqual({ message: "hi" });
    expect(takeNavState("login")).toBeUndefined();
  });

  it("returns undefined for unknown keys", () => {
    expect(takeNavState("no-such-key")).toBeUndefined();
  });

  it("keys are independent", () => {
    setNavState("a", 1);
    setNavState("b", 2);
    expect(takeNavState("a")).toBe(1);
    expect(takeNavState("b")).toBe(2);
    expect(takeNavState("a")).toBeUndefined();
  });

  it("overwrites a value set twice without take", () => {
    setNavState("x", "first");
    setNavState("x", "second");
    expect(takeNavState("x")).toBe("second");
  });
});
