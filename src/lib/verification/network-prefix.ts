// Coarse prefix of a client address: IPv4 /24 or the first three IPv6 hextets.
// Pure (no env) so it is unit-testable; the keyed HMAC bucket built on top
// lives in $lib/server/stamp-bucket. The scoring core only ever needs "same
// neighborhood or not", never the address itself.
export function networkPrefix(address: string): string | null {
  const trimmed = address.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.includes(":")) {
    return trimmed.toLowerCase().split(":").slice(0, 3).join(":");
  }
  const octets = trimmed.split(".");
  if (octets.length !== 4) return null;
  return octets.slice(0, 3).join(".");
}
