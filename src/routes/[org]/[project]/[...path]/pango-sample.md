---
title: Pango's jungle gym
description: Where Pango the pangolin tests every bar, scale, and somersault. If a markdown construct survives the climb here, it renders for readers too.
---

Welcome to the gym. Pango is **warming up**, doing a few _stretches_, and
ignoring the sign that says ~~no rolling on the high bars~~. Every block below is
a piece of equipment he's about to climb, so edit
`src/routes/[org]/[project]/[...path]/pango-sample.md` and watch him try it live.

He brought a `snack`, left a note at [the burrow](/pangos/jungle-gym), waved at a
[friend off-site](https://example.com) (new tab, very polite), and shouted his
address into the void: <https://docolin.com>.

Two lines of chatter,
which stay one paragraph because line breaks are off (good, Pango talks a lot).

## Climbing the bars

In order, the way Pango insists:

1. Sniff the first bar
2. Climb it anyway
   1. Lose grip
   2. Curl into a ball
3. Bounce to the next bar

Off the rails, the way he actually does it:

- Top bar
- Middle bar with a **firm grip** and a `chalk` reach
  - Side rung
  - Lower side rung
    - The bit only his tail can reach
- Bottom bar (safe, boring)

Today's training plan:

- [x] Find the gym
- [x] Eat 1,000 ants (pre-workout)
- [ ] Reach the top without rolling off
- [ ] Stick the landing

## Pango says

> Scales on, snout up, and never look down.
>
> > (He looked down. He rolled into a ball. He was fine.)

## Build logs

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

## Snack menu

| Snack        | Crunch | Pango's rating |
| ------------ | ------ | -------------- |
| Black ants   | high   | `5/5`          |
| Termites     | medium | 4/5            |
| Mystery grub | ???    | 3/5            |

## Signs around the gym

!!! info "Open dusk to dawn"
    Pango is nocturnal, so the gym only really gets going once the sun is down.
    Bring a [headlamp](/pangos/jungle-gym).

!!! tip
    Rolling into a ball counts as a dismount. Style points awarded for tightness.

!!! note
    Scales are self-cleaning. Please do not polish the pangolin.

!!! warning "Chalk up first"
    The high bars get slippery after the 1,000th ant.

!!! danger "Do not unroll a pangolin"
    Do **not** unroll a curled pangolin. It can wait you out for hours, and it
    will:

    - ignore you completely
    - win

    Seriously. Just leave a few ants and back away.

## Hidden hatches

Some equipment only opens when Pango pokes it. Collapsible callouts, one closed
and one open by default, with nested content to prove the body still parses:

??? note "What's behind the loose scale?"
    A spare snack and a folded map of every air vent. Standard pangolin
    contingency planning.

???+ warning "Read before the high bars"
    Chalk first. The fall is short but the somersault is involuntary.

    ```bash
    # the only safe descent Pango trusts
    curl --into-a-ball
    ```

## Mascot shot

![Pango mid-somersault off the high bar](https://placehold.co/720x240/png)

## Closing time

Lights above the rule.

---

Lights below the rule. Pango is asleep in a ball.

## Equipment depth

### A side rung (level 3, shows in the table of contents)

#### A bolt on the rung (level 4, too small for the table of contents)

That's the whole gym. Now go change a bar and watch it render.
