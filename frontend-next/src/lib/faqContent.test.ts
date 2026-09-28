import { describe, it, expect } from "vitest";
import { normalizeFaqs } from "@/lib/faqContent";
import type { Faq } from "@/types";

const faq = (id: string, question: string): Faq => ({ _id: id, question, answer: `a-${id}` });

describe("normalizeFaqs", () => {
  it("flattens the grouped payload in category order and tags each item", () => {
    const { categories, faqs } = normalizeFaqs({
      categories: ["Booking", "Payment"],
      faqs: { Booking: [faq("1", "How do I book?")], Payment: [faq("2", "Refund?")] },
    });

    expect(categories).toEqual(["Booking", "Payment"]);
    expect(faqs.map((f) => f._id)).toEqual(["1", "2"]);
    expect(faqs.map((f) => f.category)).toEqual(["Booking", "Payment"]);
    expect(faqs[0].question).toBe("How do I book?");
  });

  it("keeps group keys the API left out of `categories`", () => {
    const { categories, faqs } = normalizeFaqs({
      categories: ["Booking"],
      faqs: { Booking: [faq("1", "q")], Extras: [faq("2", "q")] },
    });

    expect(categories).toEqual(["Booking", "Extras"]);
    expect(faqs).toHaveLength(2);
  });

  it("survives empty, missing and malformed payloads", () => {
    expect(normalizeFaqs(undefined)).toEqual({ categories: [], faqs: [] });
    expect(normalizeFaqs(null)).toEqual({ categories: [], faqs: [] });
    expect(normalizeFaqs({})).toEqual({ categories: [], faqs: [] });
    expect(normalizeFaqs({ categories: "Booking", faqs: [] })).toEqual({ categories: [], faqs: [] });
    expect(normalizeFaqs({ categories: ["A"], faqs: [{ _id: "1" }] })).toEqual({ categories: ["A"], faqs: [] });
    expect(normalizeFaqs({ faqs: { A: "not-an-array" } })).toEqual({ categories: ["A"], faqs: [] });
  });

  it("drops nothing when a category repeats", () => {
    const { faqs } = normalizeFaqs({
      categories: ["A", "A"],
      faqs: { A: [faq("1", "q")] },
    });
    expect(faqs.map((f) => f._id)).toEqual(["1", "1"]);
  });
});
