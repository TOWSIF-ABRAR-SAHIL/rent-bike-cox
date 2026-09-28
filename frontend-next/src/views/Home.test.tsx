import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Home from "@/views/Home";
import api from "@/api/axios";
import type { Bike } from "@/types";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stand-in for next/image in jsdom
  default: ({ alt }: { alt?: string }) => <img alt={alt ?? ""} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// The live fleet map is a client-only leaflet bundle; nothing here needs it.
vi.mock("next/dynamic", () => ({ default: () => () => null }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: null, token: null }) }));
vi.mock("@/context/useCompare", () => ({
  useCompare: () => ({ toggle: vi.fn(), has: () => false }),
}));
vi.mock("@/context/useWishlist", () => ({
  useWishlist: () => ({ toggle: vi.fn(), has: () => false }),
}));
vi.mock("@/hooks/useSiteContent", () => ({
  default: () => ({ get: (_key: string, fallback = "") => fallback, content: {}, loading: false }),
}));
vi.mock("@/components/SeasonalBadge", () => ({ CurrentSeasonalInfo: () => null }));

const get = vi.mocked(api.get);

const bike = (id: string, model: string): Bike => ({
  _id: id,
  model,
  brand: "TVS",
  pricePerHour: 200,
  images: [],
  category: { _id: "c1", name: "Bike", slug: "bike" },
});

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: [] });
});

describe("Home view server-prefetch seeding", () => {
  it("renders prefetched bikes with no storefront request on mount", () => {
    render(
      <Home
        initialBikes={[bike("b1", "Scooty Pep Plus")]}
        initialCategories={[]}
        initialFaqs={[]}
        initialRatings={{}}
      />
    );

    // The model shows in the card and in the hero; either way it came from the server.
    expect(screen.getAllByText("Scooty Pep Plus").length).toBeGreaterThan(0);
    // Fully seeded: not even the sidebar requests go out.
    expect(get).not.toHaveBeenCalled();
  });

  it("shows no skeleton once the server data is seeded", () => {
    const { container } = render(
      <Home
        initialBikes={[bike("b1", "Scooty Pep Plus")]}
        initialCategories={[]}
        initialFaqs={[]}
        initialRatings={{}}
      />
    );
    expect(container.querySelectorAll(".skeleton").length).toBe(0);
  });

  it("fetches the storefront itself when nothing was prefetched", async () => {
    render(<Home />);

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/dashboard/bikes/available", { params: {} })
    );
  });

  it("still fetches when the user searches after a prefetch", async () => {
    render(
      <Home
        initialBikes={[bike("b1", "Scooty Pep Plus")]}
        initialCategories={[]}
        initialFaqs={[]}
        initialRatings={{}}
      />
    );

    // Seeding must not disable the interactive path.
    expect(get).not.toHaveBeenCalledWith("/dashboard/bikes/available", expect.anything());

    fireEvent.change(screen.getByPlaceholderText("Search by model or brand..."), {
      target: { value: "yamaha" },
    });

    await waitFor(
      () =>
        expect(get).toHaveBeenCalledWith("/dashboard/bikes/available", {
          params: { search: "yamaha" },
        }),
      { timeout: 2000 }
    );
  });
});
