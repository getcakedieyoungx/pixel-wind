# Pixel Wind

Turn any pixel-art sprite into a seamless wind sway loop — **no shimmer, no new colours, frame 1 = your sprite**. Runs entirely in your browser.

![Left: typical rotation sway. Right: Pixel Wind.](docs/media/compare.gif)

**Try it:** https://pixel-wind.vercel.app

On the demo tree, a typical rotation sway changes **48,406 pixels per loop**; Pixel Wind changes **7,732** — about 6× less flicker for the same breeze.

## Why it doesn't shimmer

Most wind shaders rotate or skew the sprite and round every pixel on its own, so interior pixels jump around. Pixel Wind inverse-maps your sprite through an *integer* displacement field built from leaf-clump-sized noise and a few timing clusters:

    dst(x, y) = src(x - dx, y - dy)

Every output pixel takes exactly one source pixel, so neighbouring clumps can move by different amounts without tearing seams — and no colour is ever invented.

## Guarantees (checked on every export)

- Frame 1 is byte-identical to your sprite
- No colours or transparency levels that aren't in your sprite
- Everything below the pin line never moves
- Max 1–3 px sideways, 1 px vertical
- The loop's last → first step is as smooth as the others

## Export

GIF · sprite sheet PNG + Aseprite-style JSON (`wind` tag) · ZIP of frames

## Develop

    npm install
    npm run dev
    npm test

## Licence

Code: MIT © getcakedieyoungx.

**The demo tree is © 2026 yalpo — all rights reserved** and is not covered by the MIT licence; see [ASSETS-LICENSE.md](ASSETS-LICENSE.md). Use your own sprites with the tool freely.
