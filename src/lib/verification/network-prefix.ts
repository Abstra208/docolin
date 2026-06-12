// Coarse prefix of a client address: IPv4 /24 or the first three IPv6 hextets.
// Pure (no env) so it is unit-testable; the keyed HMAC bucket built on top
// lives in $lib/server/stamp-bucket. The scoring core only ever needs "same
// neighborhood or not", never the address itself. Inputs come from the
// platform's client address and should always be well-formed, but garbage
// must yield null rather than a fake bucket clustering could be gamed with.

function isHexSegment(segment: string): boolean {
  // Empty segments are legal in compressed IPv6 ("::1").
  if (segment.length > 4) return false;
  for (const c of segment) {
    const hex = (c >= "0" && c <= "9") || (c >= "a" && c <= "f");
    if (!hex) return false;
  }
  return true;
}

function isOctet(segment: string): boolean {
  if (segment.length === 0 || segment.length > 3) return false;
  for (const c of segment) {
    if (c < "0" || c > "9") return false;
  }
  return Number(segment) <= 255;
}

export function networkPrefix(address: string): string | null {
  const trimmed = address.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.includes(":")) {
    const segments = trimmed.toLowerCase().split(":");
    if (segments.length < 3 || !segments.every(isHexSegment)) return null;
    return segments.slice(0, 3).join(":");
  }
  const octets = trimmed.split(".");
  if (octets.length !== 4 || !octets.every(isOctet)) return null;
  return octets.slice(0, 3).join(".");
}
