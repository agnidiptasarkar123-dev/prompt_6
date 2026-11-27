// SPDX-License-Identifier: Apache-2.0

const DEFAULT_MAX_RESPONSE_BYTES = 4_194_304; // 4 MB upstream JSON response cap

function isRestrictedIpv4Octets(a: number, b: number): boolean {
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateOrMetadataHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("ff")
  ) {
    return true;
  }

  // Decode IPv4-mapped IPv6 literals normalized by WHATWG URL (e.g. ::ffff:7f00:1 / ::ffff:a9fe:a9fe)
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1]!, 16);
    const a = (hi >> 8) & 0xff;
    const b = hi & 0xff;
    if (isRestrictedIpv4Octets(a, b)) {
      return true;
    }
  }

  // Reject loopback, link-local / cloud metadata (169.254.0.0/16), CGNAT (100.64/10), and RFC1918 IPv4
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    const octets = host.split(".").map(Number);
    if (isRestrictedIpv4Octets(octets[0]!, octets[1]!)) {
      return true;
    }
  }
  return false;
}

function assertSafeUpstreamUrl(
  rawUrl: string,
  allowedHosts?: readonly string[]
): { readonly parsed: URL; readonly safeDisplayUrl: string } {
  const parsed = new URL(rawUrl);
  if (parsed.username || parsed.password) {
    throw new Error("Upstream URL must not contain embedded credentials.");
  }

  const isLocalDevHttp =
    parsed.protocol === "http:" &&
    parsed.hostname === "localhost" &&
    process.env.NODE_ENV !== "production";

  if (parsed.protocol !== "https:" && !isLocalDevHttp) {
    throw new Error(`Unsafe upstream protocol blocked: ${parsed.protocol}`);
  }

  if (isPrivateOrMetadataHost(parsed.hostname)) {
    throw new Error(`Private or link-local upstream host blocked: ${parsed.hostname}`);
  }

  if (allowedHosts && allowedHosts.length > 0 && !allowedHosts.includes(parsed.hostname)) {
    throw new Error(`Untrusted upstream host blocked: ${parsed.hostname}`);
  }

  return {
    parsed,
    safeDisplayUrl: `${parsed.origin}${parsed.pathname}`
  };
}

async function readBoundedResponseJson(response: Response, maxBytes: number, errorPrefix: string): Promise<unknown> {
  const contentLength = response.headers?.get?.("content-length");
  if (contentLength) {
    const len = Number(contentLength);
    if (Number.isFinite(len) && len > maxBytes) {
      throw new Error(`${errorPrefix} upstream response exceeded maximum size of ${maxBytes} bytes`);
    }
  }

  const bodyStream = response.body;
  if (bodyStream && typeof bodyStream.getReader === "function") {
    const reader = bodyStream.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new Error(`${errorPrefix} upstream response exceeded maximum size of ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(merged)) as unknown;
  }

  return response.json();
}

export interface UpstreamFetchOptions<T> {
  readonly url: string;
  readonly timeoutMs: number;
  readonly errorPrefix: string;
  readonly headers?: Record<string, string>;
  readonly displayUrl?: string;
  readonly allowedHosts?: readonly string[];
  readonly maxResponseBytes?: number;
  readonly mapHttpError?: (response: Response) => Error | null;
  readonly parse: (json: unknown) => T;
}

/**
 * Shared hardened external JSON fetch helper enforcing URL SSRF validation,
 * `redirect: "error"`, AbortController timeouts, bounded response streaming,
 * redacted error URLs, and schema-validated parsing.
 */
export async function fetchJsonWithTimeout<T>(options: UpstreamFetchOptions<T>): Promise<T> {
  const { safeDisplayUrl } = assertSafeUpstreamUrl(options.url, options.allowedHosts);
  const maxBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(options.url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...options.headers
      },
      redirect: "error",
      signal: controller.signal
    });

    if (!response.ok) {
      const customError = options.mapHttpError?.(response);
      if (customError) {
        throw customError;
      }
      throw new Error(
        `${options.errorPrefix} upstream error: HTTP ${response.status} from ${options.displayUrl ?? safeDisplayUrl}`
      );
    }

    const json = await readBoundedResponseJson(response, maxBytes, options.errorPrefix);
    return options.parse(json);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`${options.errorPrefix} upstream request timed out after ${options.timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
