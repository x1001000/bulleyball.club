# Bulleyball rule film

This branch holds only the source of the Instagram rule reel. The site lives on
`gh-pages`; nothing here is published. Rendered MP4s are deliberately not committed.

A 31.6 s vertical reel (1080x1920, 30 fps) explaining the one rule, rendered
with three.js in headless Chromium, narrated with edge-tts. Two cuts:

| cut  | on screen                                   | voice                         |
|------|---------------------------------------------|-------------------------------|
| `zh` | Chinese captions, English line under them   | zh-TW-HsiaoChenNeural, +0%    |
| `en` | English captions and slogan only            | en-US-AvaNeural, +0%          |

    npm install                               # three.js
    node render.js stills 4.4,12              # test frames -> out/still-<t>.jpg
    node render.js video 0 31.6 film          # zh cut -> out/film.mp4 (about 25 min; split the range to run halves in parallel)
    CUT=en node render.js video 0 31.6 film   # en cut
    node narrate.mjs zh                       # narration track -> vo/zh/narration.wav  (add --tts to re-voice the lines)
    ffmpeg -i out/film.mp4 -i vo/zh/narration.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k reel.mp4

- `sim.js`     the rally: ball path and player positions, copied from the site's `assets/js/court3d.js`
- `script.js`  the edit: beats, captions, narration lines and their times, per cut
- `film.html`  the scene: court, players, cameras, overlays
- `render.js`  drives the page frame by frame and pipes frames to ffmpeg
- `narrate.mjs` / `tts.py`  narration lines -> mp3 -> one track timed to the film
- `fonts/`     Noto Sans TC subset (only the glyphs the captions use) and Press Start 2P

`render.js` hard-codes the Playwright path `/opt/node22/lib/node_modules/playwright` and `narrate.mjs`
the Python that has edge-tts; change both elsewhere. New caption text needs the font subset fetched
again for its glyphs (Google Fonts `css2?family=Noto+Sans+TC:wght@900&text=...`).
