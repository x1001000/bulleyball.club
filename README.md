# bulleyball.club

Official site for **地攤排球運動推廣俱樂部 / Bulleyball Club** — a non-profit club promoting
Bulleyball: 2v2 / 3v3 street volleyball played on ordinary hard courts.

*攤子一擺，球不落地。 — Set up the stall. The ball never lands.*

## What's here

A static site. No build step, no framework, no runtime dependencies.

```
index.html              all page content (Chinese inline as the no-JS default)
assets/css/style.css    pixel-arcade styling; day/night palettes as CSS custom properties
assets/js/i18n.js       the entire bilingual copy deck (zh-Hant / en), 145 keys
assets/js/court3d.js    the 3D court: a from-scratch software renderer
assets/js/app.js        language switch, theme switch, nav, stage wiring
assets/img/og.png       social preview, rendered from court3d.js itself
CNAME                   custom domain for GitHub Pages
```

### Features

- **Bilingual** — 中文 / English, switched client-side with no reload. Choice persists in
  `localStorage`; first visit follows `navigator.language`.
- **Day / night** — light mode is a daytime outdoor court, dark mode is the same court under
  floodlights. First visit follows `prefers-color-scheme`; the choice persists.
- **Pixel 3D rally** — a looping 2v2 point (serve → dig → set → spike → block → point) that
  ends by demonstrating the sport's one distinctive rule.
- Respects `prefers-reduced-motion` (holds a still frame), pauses when scrolled out of view
  or when the tab is hidden, and has a manual pause button.

## Running it locally

Any static server:

```sh
python3 -m http.server 8000    # then open http://localhost:8000
```

## How the 3D court works

`court3d.js` has no dependencies — no Three.js, no WebGL. It draws into a **384 × 216**
canvas that CSS upscales with `image-rendering: pixelated`, so the low resolution *is* the
art direction. Per frame it:

1. builds the scene as a flat list of world-space quads (court, lines, net, voxel players,
   floodlights, skyline, the courtside stall the sport is named after);
2. transforms them into camera space, clips against the near plane (Sutherland–Hodgman),
   and projects perspectively;
3. sorts and fills them back-to-front (painter's algorithm), with flat per-face shading from
   a single light direction.

Coplanar ground geometry (surface → front zones → lines → shadows) is assigned explicit
render layers rather than relying on depth sorting, which painter's algorithm gets wrong for
overlapping flat quads.

Day and night are two palettes that cross-fade over 0.7 s when the theme changes.

### Editing the rally

The point is choreographed by two tables near the bottom of `court3d.js`:

- `NODES` — every ball contact: time, position, which player touches it, and the caption key.
  The ball follows a parabola between consecutive nodes (`arc` controls how high).
- `KEYS` — per-player movement keyframes `[time, x, z, jumpHeight]`, eased between.

Both are in metres on a real 18 × 9 m court with the net at `x = 0` and the 3 m lines at
`x = ±3`. `BBCourt.seek(t)` jumps to any moment, which is how the screenshots were checked.

## Editing the copy

All user-facing text lives in `assets/js/i18n.js` as `{ zh: {...}, en: {...} }`. The HTML
carries `data-i18n="key"` and the Chinese text inline, so the page still reads correctly
with JavaScript disabled. Add a key to **both** dictionaries or the switch will fall back to
Chinese for that string.

## Placeholders to replace before launch

This site ships with the club's positioning and rules written out, but a few facts are
deliberately marked rather than invented:

| Where | What's missing |
|---|---|
| `contact.*`, `join.cta.btn`, `contact.box.btn` | `hello@bulleyball.club` — swap for the real inbox |
| `sup.gov.g4.p` | legal registration details (currently "籌備階段 / being formed") |
| `sup.note` | donation channel and receipting — **no payment details are published until an account is confirmed** |
| `contact.area.v`, `contact.social.v` | home court location and social links |
| `contact.box` "Next open court" | the actual date, currently `TBD` |
| `sup.t1`–`sup.t3` amounts | the NT$ figures are illustrative unit costs — check against real quotes |

The rules are published as **draft v0.1** and labelled as open to community revision, which
matches how the sport is being developed.

## Deploying

GitHub Pages from the default branch serves this directly; `CNAME` points at
`bulleyball.club`. `.nojekyll` stops Jekyll from touching the asset folders. Any static host
(Cloudflare Pages, Netlify) works with no configuration.

Google Fonts (`Press Start 2P`) is the only external request; the site degrades to a
monospace stack if it's blocked.
