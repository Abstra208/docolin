import { env } from "$lib/server/env";
import { networkPrefix } from "$lib/verification/network-prefix";

// Coarse, keyed network bucket for stamp clustering. The scoring core
// discounts correlated anonymous stamps from the same network; for that it
// only needs "these came from the same neighborhood", never the address
// itself. So: collapse to the /24 (IPv4) or the first three hextets (IPv6),
// then HMAC with a server secret and truncate. Without the key the stored
// value cannot be reversed to a network even by enumerating the small prefix
// space; without the secret configured we store nothing rather than degrade
// to an unkeyed hash.

/** HMAC-keyed bucket id for a client address, or null when the address is
 *  unparseable or STAMP_BUCKET_SECRET is unset. */
export async function stampNetworkBucket(address: string): Promise<string | null> {
  const secret = env.STAMP_BUCKET_SECRET;
  if (!secret) return null;
  const prefix = networkPrefix(address);
  if (prefix === null) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(prefix)));
  // 16 hex chars (64 bits) is far beyond collision concerns for clustering.
  return [...mac.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
