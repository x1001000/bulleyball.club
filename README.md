# bulleyball.club

Landing page for **鬥牛排球運動推廣社 / Bulleyball Club** — an open proposal for a volleyball
rule variant called **鬥牛排球 (Bulleyball)**, "牛排" for short.

*球不落地、我就自由 — While the ball is up, I'm free.*

## The proposal

Basketball grew a pick-up format (台灣俗稱「鬥牛」) out of the full-court game; volleyball never
did. Bulleyball puts **two or three players a side on a full standard 18 × 9 m court**, plays under
the **indoor six-a-side rulebook** (not beach rules), and changes exactly one thing:

> A ball landing inside the 3 m line is **out** —
> unless it landed there after a **successful block**, in which case it is live and judged as normal.

Everything else — three touches, rally scoring, net and centre-line faults, how lifts and double
contacts are judged — follows the indoor rulebook. The court is never shrunk: fewer players cover
the same ground, which is what pick-up basketball did to the full-court game.

The one rule does double duty. It kills the dink, so every attack has to be driven deep — and it
takes the front zone out of play, so two or three players are defending 54 m² instead of 81 m²,
which is what makes a small squad on a full court viable at all. With no rotation there is no
front row or back row either, so anyone can attack from anywhere: *球不落地、我就自由*.

The rule is published as **v0.1**, explicitly open to revision from people who actually play it.

## What's here

A static site. No build step, no framework, no runtime dependencies.

```
index.html              all page content (Chinese inline as the no-JS default)
assets/css/style.css    pixel-arcade styling; day/night palettes as CSS custom properties
assets/js/i18n.js       the entire bilingual copy deck (zh-Hant / en), 113 keys
assets/js/court3d.js    the 3D court: a from-scratch software renderer
assets/js/app.js        language switch, theme switch, nav, stage wiring
assets/img/og.png       social preview, rendered from court3d.js itself
CNAME                   custom domain for GitHub Pages
```

### Features

- **Bilingual** — 中文 / English, switched client-side with no reload. Choice persists in
  `localStorage`; first visit follows `navigator.language`.
- **Day / night** — light mode is a daytime outdoor court, dark mode the same court under
  floodlights. First visit follows `prefers-color-scheme`; the choice persists.
- **Pixel 3D rally** — a looping 2v2 point that ends by demonstrating the rule.
- Respects `prefers-reduced-motion` (holds a still frame), pauses when scrolled out of view or
  when the tab is hidden, and has a manual pause button.

## Running it locally

Any static server:

```sh
python3 -m http.server 8000    # then open http://localhost:8000
```

## How the 3D court works

`court3d.js` has no dependencies — no Three.js, no WebGL. It draws into a **384 × 216** canvas
that CSS upscales with `image-rendering: pixelated`, so the low resolution *is* the art direction.
Per frame it:

1. builds the scene as a flat list of world-space quads (court, lines, net, four voxel players,
   floodlights, courtside bench, skyline);
2. transforms them into camera space, clips against the near plane (Sutherland–Hodgman), and
   projects perspectively;
3. sorts and fills them back-to-front (painter's algorithm), with flat per-face shading from a
   single light direction.

Coplanar ground geometry (surface → front zones → lines → shadows) is assigned explicit render
layers rather than relying on depth sorting, which painter's algorithm gets wrong for overlapping
flat quads. Day and night are two palettes that cross-fade over 0.7 s when the theme changes; the
whole scene runs at ~60 fps.

### The rally

The point is choreographed by two tables in `court3d.js`:

- `NODES` — every ball contact: time, position, which player touches it, and the caption key.
  The ball follows a parabola between consecutive nodes (`arc` sets how high the incoming
  segment flies).
- `KEYS` — per-player movement keyframes `[time, x, z, jumpHeight]`, eased between.

Positions are metres on a real 18 × 9 m court, net at `x = 0`, 3 m lines at `x = ±3`. Four players:
`A1`/`A2` and `B1`/`B2`.

The scripted point runs serve → dig → set → spike → dig → set → spike → **block**, and the
deflected ball drops inside Team B's 3 m front zone: out under the base rule, good under the block
exception. `BBCourt.seek(t)` jumps to any moment, which is how each beat was checked.

## Editing the copy

All user-facing text lives in `assets/js/i18n.js` as `{ zh: {...}, en: {...} }`. The HTML carries
`data-i18n="key"` and the Chinese text inline, so the page still reads correctly with JavaScript
disabled. Add a key to **both** dictionaries or the switch will fall back to Chinese for that
string.

## Before launch

The site deliberately claims nothing that isn't true yet — it's an advocacy page, so there are no
donation channels, no registration numbers, no venue or schedule listings to fill in. One thing
does need replacing:

| Where | What |
|---|---|
| `contact.*`, the two `mailto:` links | `hello@bulleyball.club` — swap for the real inbox |

## Deploying

GitHub Pages from the default branch serves this directly; `CNAME` points at `bulleyball.club`.
`.nojekyll` stops Jekyll from touching the asset folders. Any static host (Cloudflare Pages,
Netlify) works with no configuration.

Google Fonts (`Press Start 2P`) is the only external request; the site degrades to a monospace
stack if it's blocked.
