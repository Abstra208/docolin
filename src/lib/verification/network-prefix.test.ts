import { describe, it, expect } from "bun:test";
import { networkPrefix } from "./network-prefix";

// Pins the coarse-prefix rules stamp clustering depends on: /24 for IPv4, the
// first three hextets for IPv6, null for garbage.
describe("networkPrefix", () => {
  it("collapses IPv4 to the /24", () => {
    expect(networkPrefix("203.0.113.7")).toBe("203.0.113");
    expect(networkPrefix("203.0.113.250")).toBe("203.0.113");
  });

  it("collapses IPv6 to the first three hextets", () => {
    expect(networkPrefix("2001:db8:85a3::8a2e:370:7334")).toBe("2001:db8:85a3");
    expect(networkPrefix("2001:DB8:85A3::1")).toBe("2001:db8:85a3");
  });

  it("rejects unparseable addresses", () => {
    expect(networkPrefix("")).toBeNull();
    expect(networkPrefix("not-an-ip")).toBeNull();
    expect(networkPrefix("10.0.0")).toBeNull();
  });
});
