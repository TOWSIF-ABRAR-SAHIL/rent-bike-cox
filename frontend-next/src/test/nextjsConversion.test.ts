import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the React (Vite) → Next.js (App Router) conversion.
 *
 * These checks are static on purpose: they fail on conversion artifacts that a
 * green `next build` would happily ignore (a file no route reaches, a leftover
 * SPA import, a missing "use client" boundary in an unreferenced component).
 */

const SRC = path.resolve(__dirname, "..");

function sourceFiles(dir: string = SRC): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [full];
  });
}

const FILES = sourceFiles().map((file) => ({
  path: path.relative(SRC, file).split(path.sep).join("/"),
  code: fs.readFileSync(file, "utf8"),
}));

const CLIENT_HOOKS =
  /\b(useState|useEffect|useRef|useContext|useReducer|useLayoutEffect|useSearchParams|useRouter|usePathname)\s*\(/;
const DECLARES_CUSTOM_HOOK = /export\s+(default\s+)?(function|const)\s+use[A-Z]/;

describe("Next.js conversion guard", () => {
  it("finds the source tree it is meant to check", () => {
    expect(FILES.length).toBeGreaterThan(50);
  });

  it("declares 'use client' in every file that calls a client hook", () => {
    const offenders = FILES.filter(
      ({ code }) =>
        CLIENT_HOOKS.test(code) &&
        !/^\s*["']use client["'];?/m.test(code) &&
        !DECLARES_CUSTOM_HOOK.test(code),
    ).map(({ path: p }) => p);

    expect(offenders).toEqual([]);
  });

  it("has no React Router, Vite or manual DOM-root leftovers", () => {
    const artifacts = [
      /from\s+["']react-router/,
      /from\s+["']vite["']/,
      /import\.meta\.env/,
      /react-dom\/client/,
      /document\.getElementById\(["']root["']\)/,
    ];
    const offenders = FILES.filter(({ code }) =>
      artifacts.some((pattern) => pattern.test(code)),
    ).map(({ path: p }) => p);

    expect(offenders).toEqual([]);
  });

  it("keeps env access on the NEXT_PUBLIC_ prefix", () => {
    const offenders = FILES.filter(
      ({ code }) =>
        /process\.env\.(REACT_APP_|VITE_)/.test(code) ||
        // Client-rendered files may only read NEXT_PUBLIC_*; server-only reads are
        // allowlisted explicitly (NODE_ENV is inlined by Next itself).
        (/["']use client["']/.test(code) &&
          [...code.matchAll(/process\.env\.([A-Z0-9_]+)/g)].some(
            ([, name]) => name !== "NODE_ENV" && !name.startsWith("NEXT_PUBLIC_"),
          )),
    ).map(({ path: p }) => p);

    expect(offenders).toEqual([]);
  });

  it("gives every route a page, error UI or route handler", () => {
    const appDir = path.join(SRC, "app");
    const ROUTE_FILES = [
      "page.tsx",
      "route.ts",
      "not-found.tsx",
      "global-error.tsx",
      "opengraph-image.tsx",
      "sitemap.ts",
      "robots.ts",
      "manifest.ts",
    ];
    const subdirs = (dir: string) =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => path.join(dir, e.name));

    // A directory may be a pure path prefix (`bike/` holds only `[id]/`) — only
    // directories with no routable descendant have to carry a route file.
    const hasRoutableDescendant = (dir: string): boolean =>
      ROUTE_FILES.some((f) => fs.existsSync(path.join(dir, f))) ||
      subdirs(dir).some(hasRoutableDescendant);

    const missing: string[] = [];
    const walk = (dir: string) => {
      if (!hasRoutableDescendant(dir)) {
        missing.push(path.relative(appDir, dir).split(path.sep).join("/"));
      }
      subdirs(dir).forEach(walk);
    };

    walk(appDir);
    expect(missing).toEqual([]);
    expect(hasRoutableDescendant(appDir)).toBe(true);
  });

  describe("server rendering scope", () => {
    const readPage = (page: string) => fs.readFileSync(path.join(SRC, page), "utf8");

    it("prefetches the public pages on the server", () => {
      for (const page of ["app/page.tsx", "app/faq/page.tsx", "app/bike/[id]/page.tsx"]) {
        const code = readPage(page);
        expect(code, page).not.toMatch(/^\s*["']use client["']/m);
        expect(code, page).toMatch(/async function/);
        expect(code, page).toContain("serverGetOrNull");
      }
    });

    it("keeps session-scoped pages out of the server render", () => {
      // These read or write a signed-in user's data through the axios client (which
      // carries the token), so they must not be prefetched server-side.
      for (const page of [
        "app/profile/page.tsx",
        "app/my-bookings/page.tsx",
        "app/checkout/[bikeId]/page.tsx",
        "app/admin-dashboard/page.tsx",
        "app/renter-dashboard/page.tsx",
      ]) {
        expect(readPage(page), page).not.toContain("serverApi");
      }
    });

    it("ships the static policy pages without a client component", () => {
      for (const view of ["Policies.tsx", "PrivacyPolicy.tsx", "TermsOfService.tsx"]) {
        const code = fs.readFileSync(path.join(SRC, "views", view), "utf8");
        expect(code, view).not.toMatch(/^\s*["']use client["']/m);
        expect(code, view).not.toMatch(/\buse(State|Effect|Ref|Callback|Memo)\s*\(/);
      }
    });
  });
});
