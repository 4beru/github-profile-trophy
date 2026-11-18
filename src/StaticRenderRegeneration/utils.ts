import { readFileSync, existsSync } from "node:fs";

export function getUrl(request: Request) {
  try {
    return new URL(request.url);
  } catch {
    return {
      pathname: request.url,
      search: request.url,
    };
  }
}

export function readCache(cacheFilePath: string): Uint8Array | null {
  try {
    return readFileSync(cacheFilePath);
  } catch {
    return null;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
export async function hashString(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  return hashHex;
}

