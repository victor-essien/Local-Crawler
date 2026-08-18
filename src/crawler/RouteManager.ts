import { URL } from "node:url";
/**
 * RouteManager
 *
 * Responsible for turning a base URL + a list of route strings into
 * safe, absolute URLs. This service is scoped to local development
 * servers, so it also enforces that the resolved host is a recognized
 * "local" host (localhost, 127.0.0.1, ::1, *.localhost, or a private
 * LAN address used for local dev).
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"]);

/** RFC 1918 / link-local ranges commonly used for local dev (e.g. LAN preview on a phone). */
function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export class InvalidBaseUrlError extends Error {
  code = "INVALID_BASE_URL";
}

export class NonLocalUrlError extends Error {
  code = "NON_LOCAL_URL";
}

export interface ResolvedRoute {
  route: string;
  url: string;
}

export class RouteManager {
  private readonly base: URL;

  constructor(baseUrl: string, options: { allowNonLocal?: boolean } = {}) {
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new InvalidBaseUrlError(`Invalid base URL: "${baseUrl}"`);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new InvalidBaseUrlError(
        `Invalid base URL: "${baseUrl}" — only http:// and https:// are supported.`
      );
    }

    const hostname = parsed.hostname.toLowerCase();
    const isLocal =
      LOCAL_HOSTNAMES.has(hostname) ||
      hostname.endsWith(".localhost") ||
      isPrivateIpv4(hostname);

    if (!isLocal && !options.allowNonLocal) {
      throw new NonLocalUrlError(
        `"${baseUrl}" does not look like a local development server. ` +
          `This tool is designed to crawl localhost / 127.0.0.1 / private LAN addresses only. ` +
          `Pass { allowNonLocal: true } if you understand the risk and need to override this.`
      );
    }

    this.base = parsed;
  }

  /** Resolves a single route (e.g. "/pricing" or "pricing") against the base URL. */
  resolve(route: string): ResolvedRoute {
    // Use the URL API rather than string concatenation so trailing/leading
    // slashes on baseUrl and route never produce a malformed URL.
    const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
    const resolved = new URL(normalizedRoute, this.base);
    return { route, url: resolved.toString() };
  }

  resolveAll(routes: string[]): ResolvedRoute[] {
    return routes.map((route) => this.resolve(route));
  }

  /** Resolves an href found on a page (possibly relative) against the current page URL. */
  resolveHref(href: string, pageUrl: string): string | null {
    try {
      return new URL(href, pageUrl).toString();
    } catch {
      return null;
    }
  }
}
