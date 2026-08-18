import { describe, it, expect } from "vitest";
import { RouteManager, InvalidBaseUrlError, NonLocalUrlError } from "../../src/crawler/RouteManager";

describe("RouteManager", () => {
  it("resolves routes against a base URL without trailing-slash bugs", () => {
    const rm = new RouteManager("http://localhost:5173");
    expect(rm.resolve("/").url).toBe("http://localhost:5173/");
    expect(rm.resolve("/pricing").url).toBe("http://localhost:5173/pricing");
    expect(rm.resolve("pricing").url).toBe("http://localhost:5173/pricing");
  });

  it("resolves correctly even when baseUrl has a trailing slash", () => {
    const rm = new RouteManager("http://localhost:5173/");
    expect(rm.resolve("/pricing").url).toBe("http://localhost:5173/pricing");
  });

  it("resolves multiple routes", () => {
    const rm = new RouteManager("http://localhost:5173");
    const resolved = rm.resolveAll(["/", "/pricing", "/talk"]);
    expect(resolved.map((r) => r.url)).toEqual([
      "http://localhost:5173/",
      "http://localhost:5173/pricing",
      "http://localhost:5173/talk",
    ]);
  });

  it("accepts 127.0.0.1 and private LAN hosts", () => {
    expect(() => new RouteManager("http://127.0.0.1:3000")).not.toThrow();
    expect(() => new RouteManager("http://192.168.1.50:3000")).not.toThrow();
  });

  it("rejects an invalid base URL", () => {
    expect(() => new RouteManager("not a url")).toThrow(InvalidBaseUrlError);
  });

  it("rejects a non-http(s) protocol", () => {
    expect(() => new RouteManager("ftp://localhost:5173")).toThrow(InvalidBaseUrlError);
  });

  it("rejects a non-local base URL by default", () => {
    expect(() => new RouteManager("https://example.com")).toThrow(NonLocalUrlError);
  });

  it("resolves a relative href against the current page URL", () => {
    const rm = new RouteManager("http://localhost:5173");
    expect(rm.resolveHref("/pricing", "http://localhost:5173/about")).toBe(
      "http://localhost:5173/pricing"
    );
    expect(rm.resolveHref("http://", "http://localhost:5173/about")).toBeNull();
  });
});
