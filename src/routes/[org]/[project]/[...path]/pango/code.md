---
title: Code blocks
description: Inline code and fenced blocks across languages, plus the no-language and unknown-language fallbacks.
---

Every good jungle gym ships with code. Inline first: `const grip = "firm"`, then
the real bars in a few languages.

```ts
interface Pangolin {
  name: string;
  scales: number;
  rolledUp: boolean;
}

export function feedPango(p: Pangolin, ants: number): Pangolin {
  return { ...p, rolledUp: ants > 5000 };
}
```

```bash
# raise a new jungle gym from scratch
git clone https://github.com/docolin-dev/jungle-gym
cd jungle-gym && bun install
bun run climb --to top
```

```python
def somersaults(height_m: float) -> int:
    # one full curl-and-roll per half meter of fall, naturally
    return int(height_m // 0.5)
```

```json
{
  "name": "Pango",
  "species": "pangolin",
  "scales": 984,
  "favorite_snack": "ants",
  "afraid_of": ["heights", "nothing else"]
}
```

```css
.climbing-bar {
  color: var(--primary);
  border-radius: 0;
  cursor: grab;
}
```

A block with no language (the chalk dust on the bars):

```
   .--.
  ( o_o )   pango approves
   > ^ <
```

An unknown language, so Pango can confirm it falls back without faceplanting:

```doesnotexist
?? this grammar climbed the wrong bar ??
```
