"""Procedural pixel-art tree (original art for the Pixel Wind demo, CC0).

Style: a canopy built from hundreds of small stamped leaves, lit from above
(yellow-green crown fading to deep teal underneath, dark interior showing the
branches), a twisted warm-brown trunk, roots spreading over a grassy mound.

usage: python tree.py SEED WIDTH HEIGHT OUT.png
"""

import sys
import numpy as np
from PIL import Image


def ramp(*hexes):
    return [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in hexes]


LEAF = ramp("#10292f", "#173f45", "#1f5b55", "#2a7a50", "#4f9c3a", "#7fbf35", "#aee045", "#d8f46a")
BARK = ramp("#321814", "#5a2b20", "#86442a", "#b06434", "#d48a44")
GRASS = ramp("#173f47", "#1f6160", "#2a8a75", "#47b98e", "#80e2ae")
FLOWER = ramp("#e59bbd", "#fff0f6")

# leaf stamps: h = highlight, b = body, s = shadow edge
LEAVES = [
    ["  hh", " hbb", "hbbs", "bbs ", "bs  "],
    [" hh ", "hbbh", "bbbb", "sbbs", " ss "],
    ["hhb", "bbb", "bbs", "ss "],
    [" hb ", "hbbb", "bbbs", " bs "],
]
BLADES = [["h", "b", "s"], [" h", "hb", "bs"], ["h ", "bh", "sb"], ["h", "b"]]


class Canvas:
    def __init__(self, W, H):
        self.W, self.H = W, H
        self.rgb = np.zeros((H, W, 3), np.uint8)
        self.op = np.zeros((H, W), bool)

    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.W and 0 <= y < self.H:
            self.rgb[y, x] = c
            self.op[y, x] = True

    def stamp(self, shape, x, y, pal, t):
        for j, row in enumerate(shape):
            for i, ch in enumerate(row):
                if ch == " ":
                    continue
                k = t + 1 if ch == "h" else t - 1 if ch == "s" else t
                self.put(x + i, y + j, pal[max(0, min(len(pal) - 1, k))])


def strand(cv, pts, w0, w1, light=-1):
    """Thick tapered stroke along a polyline, shaded across its width."""
    segs = list(zip(pts[:-1], pts[1:]))
    total = sum(np.hypot(b[0] - a[0], b[1] - a[1]) for a, b in segs) or 1
    done = 0.0
    for (x0, y0), (x1, y1) in segs:
        ln = np.hypot(x1 - x0, y1 - y0)
        n = int(ln * 2) + 1
        nx, ny = -(y1 - y0) / (ln or 1), (x1 - x0) / (ln or 1)
        for i in range(n):
            t = i / n
            f = (done + ln * t) / total
            w = w0 + (w1 - w0) * f
            cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for s in np.arange(-w / 2, w / 2 + 0.01, 0.5):
                u = s / max(w / 2, 0.5) * light          # -1 lit side .. 1 shade side
                k = 4 if u < -0.6 else 3 if u < -0.1 else 2 if u < 0.5 else 1
                cv.put(cx + nx * s, cy + ny * s, BARK[k])
        done += ln
    return cv


def make_tree(seed, W, H):
    rng = np.random.default_rng(seed)
    cv = Canvas(W, H)
    cx = W / 2
    ground = H - H * 0.09
    mound_rx, mound_ry = W * 0.44, H * 0.075
    can_top, can_bot = H * 0.08, H * 0.71
    can_cy = (can_top + can_bot) / 2
    can_rx, can_ry = W * 0.39, (can_bot - can_top) / 2 * 0.86

    yy, xx = np.mgrid[0:H, 0:W].astype(float)

    # --- grassy mound, back half
    def mound(front):
        for _ in range(int(W * H * 0.05)):
            x = cx + rng.uniform(-1, 1) * mound_rx
            dy = mound_ry * np.sqrt(max(0, 1 - ((x - cx) / mound_rx) ** 2))
            y = ground + rng.uniform(-dy, dy)
            is_front = y > ground - 1
            if is_front != front:
                continue
            depth = (y - (ground - dy)) / max(2 * dy, 1)        # 0 back .. 1 front
            t = int(np.clip(round(0.8 + 2.6 * depth + rng.normal(0, 0.3)), 1, 3))
            cv.stamp(BLADES[rng.integers(len(BLADES))], x, y - 2, GRASS, t)

    mound(front=False)

    # --- trunk: two intertwined strands + branches
    top_y = can_cy + can_ry * 0.35
    for ph in (0.0, np.pi):
        pts = [(cx + np.sin(t * 3.6 + ph + seed) * W * 0.05 + (t - 0.5) * W * 0.03,
                ground - 2 - t * (ground - 2 - top_y)) for t in np.linspace(0, 1, 12)]
        strand(cv, pts, W * 0.09, W * 0.045)
    for k in range(5):
        side = -1 if k % 2 else 1
        sx, sy = cx + rng.uniform(-2, 2), top_y + rng.uniform(0, H * 0.08)
        ex = cx + side * rng.uniform(0.35, 0.7) * can_rx
        ey = sy - rng.uniform(0.15, 0.45) * can_ry
        mid = ((sx + ex) / 2 + side * rng.uniform(0, 4), (sy + ey) / 2 + rng.uniform(2, 6))
        strand(cv, [(sx, sy), mid, (ex, ey)], W * 0.035, 1.2, light=-side)

    # --- canopy mask: big dome + lumps, notched underneath
    mask = ((xx - cx) / can_rx) ** 2 + ((yy - can_cy) / can_ry) ** 2 <= 1
    for _ in range(9):
        a = rng.uniform(np.pi * 0.95, np.pi * 2.05)
        bx, by = cx + np.cos(a) * can_rx * 0.75, can_cy + np.sin(a) * can_ry * 0.7
        r = rng.uniform(0.09, 0.13) * W
        mask |= (xx - bx) ** 2 + (yy - by) ** 2 <= r * r
    notch = ((xx - cx) / (can_rx * 0.45)) ** 2 + ((yy - can_bot) / (can_ry * 0.35)) ** 2 <= 1
    mask &= ~notch
    mys, mxs = np.nonzero(mask)
    ctop, cbot = mys.min(), mys.max()

    # dark interior first, so gaps between leaves read as depth
    inner = mask & (((xx - cx) / can_rx) ** 2 + ((yy - can_cy) / can_ry) ** 2 <= 0.85)
    cv.rgb[inner & ~cv.op] = LEAF[0]
    cv.op |= inner

    # --- leaves
    leaves = []
    step = 3.3
    for y in np.arange(ctop - 2, cbot + 2, step):
        for x in np.arange(mxs.min() - 2, mxs.max() + 2, step):
            px, py = x + rng.uniform(-1.2, 1.2), y + rng.uniform(-1.2, 1.2)
            ix, iy = int(px), int(py)
            if not (0 <= ix < W and 0 <= iy < H and mask[iy, ix]):
                continue
            height = 1 - (py - ctop) / max(1, cbot - ctop)          # 1 at the crown
            side = (px - cx) / can_rx
            lam = -0.18 * side + 1.0 * height                          # light from above, a touch from the left
            centre = max(0, 1 - abs(side) * 1.4) * max(0, 0.75 - height)
            if rng.random() < 0.55 * centre:                           # hollow, shaded underside
                continue
            t = round(1.0 + 5.2 * lam + rng.normal(0, 0.35))
            leaves.append((int(np.clip(t, 1, 6)), rng.random(), px, py))
    leaves.sort()                                                      # bright leaves land on top
    for t, _, px, py in leaves:
        shape = LEAVES[rng.integers(len(LEAVES))]
        if rng.random() < 0.5:
            shape = [row[::-1] for row in shape]
        cv.stamp(shape, px - 1, py - 1, LEAF, t)

    # --- front grass, then roots over it, then a few tufts in front of the roots
    mound(front=True)
    for k in range(6):
        side = -1 if k % 2 else 1
        sx = cx + side * rng.uniform(1, 4)
        ex = cx + side * rng.uniform(0.35, 0.8) * mound_rx
        ey = ground + rng.uniform(-mound_ry * 0.3, mound_ry * 0.6)
        strand(cv, [(sx, ground - 6), (sx + side * 4, ground - 2), (ex, ey)], W * 0.035, 1.0, light=-side)
    for _ in range(int(W * 0.35)):
        x = cx + rng.uniform(-1, 1) * mound_rx * 0.9
        dy = mound_ry * np.sqrt(max(0, 1 - ((x - cx) / mound_rx) ** 2))
        cv.stamp(BLADES[rng.integers(len(BLADES))], x, ground + rng.uniform(0, dy) - 1, GRASS, 3)

    # --- a few blossoms on the crown edge
    edge = mask & ~np.roll(mask, 2, axis=0)
    cand = np.argwhere(edge & (yy < can_cy))
    for py, px in cand[rng.choice(len(cand), size=min(len(cand), 5), replace=False)]:
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            cv.put(px + dx, py + dy - 1, FLOWER[1] if dx == dy == 0 else FLOWER[0])

    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., :3] = cv.rgb
    rgba[..., 3] = np.where(cv.op, 255, 0)
    return rgba


if __name__ == "__main__":
    seed, W, H, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    Image.fromarray(make_tree(seed, W, H), "RGBA").save(out)
    print("wrote", out)
