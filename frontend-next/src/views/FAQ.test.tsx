import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FAQView from "@/views/FAQ";
import api from "@/api/axios";
import type { Faq } from "@/types";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const get = vi.mocked(api.get);

const faq = (id: string, question: string, answer: string): Faq => ({
  _id: id,
  question,
  answer,
  category: "Booking",
});

beforeEach(() => {
  get.mockReset();
});

describe("FAQ view server-prefetch seeding", () => {
  it("renders prefetched FAQs with no client request at all", () => {
    render(
      <FAQView
        initialFaqs={[faq("1", "How do I book?", "Pick a bike.")]}
        initialCategories={["Booking"]}
      />
    );

    // Categories start expanded, so the server HTML already showed the question.
    expect(screen.getByText("How do I book?")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load FAQs")).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("fetches and flattens on the client when nothing was prefetched", async () => {
    get.mockResolvedValueOnce({
      data: { categories: ["Payment"], faqs: { Payment: [faq("2", "Refund?", "5-7 days.")] } },
    });

    render(<FAQView />);

    await waitFor(() => expect(screen.getByText("Refund?")).toBeInTheDocument());
    expect(get).toHaveBeenCalledWith("/faqs");
  });

  it("can still retry after a failed fetch", async () => {
    get
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ data: { categories: [], faqs: {} } });

    render(<FAQView />);

    await waitFor(() => expect(screen.getByText("Failed to load FAQs")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText("Failed to load FAQs")).not.toBeInTheDocument()
    );
  });

  it("treats an empty prefetch as authoritative instead of refetching", () => {
    render(<FAQView initialFaqs={[]} initialCategories={[]} />);
    expect(get).not.toHaveBeenCalled();
  });
});
