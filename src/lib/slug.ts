// Char-by-char slug (no regex, CLAUDE.md 3.8): lowercase alphanumerics survive,
// spaces / dashes / underscores collapse to a single dash, everything else is
// dropped. Standalone (no deps) so URL helpers can use it without pulling in
// the markdown stack. Shared by heading anchors and discussion URL slugs.
export function slugify(text: string): string {
  let out = "";
  let lastWasDash = false;
  for (const c of text.toLowerCase()) {
    if ((c >= "a" && c <= "z") || (c >= "0" && c <= "9")) {
      out += c;
      lastWasDash = false;
    } else if (c === " " || c === "-" || c === "_") {
      if (!lastWasDash && out.length > 0) {
        out += "-";
        lastWasDash = true;
      }
    }
  }
  while (out.endsWith("-")) out = out.slice(0, -1);
  return out;
}
